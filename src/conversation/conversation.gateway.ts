import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server as WsServer, WebSocket } from 'ws';
import { OpenAIRealtimeWebSocket } from 'openai/beta/realtime/websocket';
import { SessionService } from '../session/session.service';

@WebSocketGateway({ path: '/ws/conversation' })
export class ConversationGateway implements OnGatewayInit {
  private readonly logger = new Logger(ConversationGateway.name);

  @WebSocketServer()
  server: WsServer;

  constructor(private readonly sessionService: SessionService) {}

  afterInit(server: WsServer) {
    server.on('connection', (socket: WebSocket, req: { url?: string }) => {
      // 1) Extraer sessionId del query-string de la URL
      const rawUrl = req.url || '';
      const [, queryString] = rawUrl.split('?');
      const params = new URLSearchParams(queryString);
      const sessionId = params.get('sessionId');

      if (!sessionId) {
        this.logger.error(
          'Conversation WS abierto sin sessionId → cerrando socket',
        );
        socket.close();
        return;
      }

      this.logger.log(`New /ws/conversation connection [${sessionId}]`);

      // 2) Preparar contexto y flags
      this.sessionService.getContext(sessionId);
      const useOpenAI = process.env.USE_OPENAI_REALTIME === 'true';
      let rtClient: OpenAIRealtimeWebSocket | null = null;
      const pendingAudio: Buffer[] = [];

      // Si usamos OpenAI, configuramos el cliente ahora
      if (useOpenAI) {
        const model = process.env.OPENAI_REALTIME_MODEL;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!model || !apiKey) {
          throw new Error(
            'OPENAI_REALTIME_MODEL and OPENAI_API_KEY must be defined',
          );
        }
        rtClient = new OpenAIRealtimeWebSocket(
          { model },
          {
            apiKey,
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          },
        );

        rtClient.socket.addEventListener('open', () => {
          this.logger.log(`Realtime connected [${sessionId}]`);
          rtClient!.send({
            type: 'session.update',
            session: {
              modalities: ['audio', 'text'],
              instructions:
                'You are a vehicle support assistant. Only answer vehicle-related queries.',
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'gpt-4o-mini-transcribe',
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
                create_response: true,
                interrupt_response: true,
              },
              temperature: 0.8,
              max_response_output_tokens: 'inf',
            },
          });
          // Enviamos audio pendiente
          while (pendingAudio.length) {
            const buf = pendingAudio.shift()!;
            rtClient!.send({
              type: 'input_audio_buffer.append',
              audio: buf.toString('base64'),
            });
          }
        });

        // Handle realtime responses...
        rtClient.on('response.audio.delta', (evt) => {
          const b64 = (evt as any).delta as string;
          socket.send(Buffer.from(b64, 'base64'));
        });
        rtClient.on('response.audio.done', () =>
          this.logger.log(`Audio done [${sessionId}]`),
        );
        rtClient.on('response.done', () =>
          this.logger.log(`Response done [${sessionId}]`),
        );
        rtClient.on('error', (err) =>
          this.logger.error('OpenAI Realtime Error:', err),
        );
        rtClient.on('input_audio_buffer.speech_started', (evt) => {
          this.logger.log(
            `User interruption at ${evt.audio_start_ms}ms [${sessionId}]`,
          );
          rtClient!.send({ type: 'response.cancel' });
        });
        rtClient.on('input_audio_buffer.committed', () => {
          rtClient!.send({ type: 'response.create' });
        });
      }

      // 3) Recibimos todos los mensajes (esperamos solo audio binario)
      socket.on('message', (data) => {
        if (Buffer.isBuffer(data)) {
          const buf = data as Buffer;
          this.logger.log(
            `Received audio (${buf.length} bytes) [${sessionId}]`,
          );

          if (useOpenAI && rtClient) {
            if (rtClient.socket.readyState !== WebSocket.OPEN) {
              pendingAudio.push(buf);
            } else {
              rtClient.send({
                type: 'input_audio_buffer.append',
                audio: buf.toString('base64'),
              });
            }
          } else {
            // Echo con delay de 3s cuando no usamos OpenAI
            setTimeout(() => socket.send(buf), 3000);
          }
        }
      });

      socket.on('close', () => {
        this.logger.log(`Connection closed [${sessionId}]`);
        rtClient?.close();
      });
    });
  }
}
