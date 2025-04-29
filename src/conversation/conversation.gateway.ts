import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';

import { Server as WsServer, WebSocket } from 'ws';
import { OpenAIRealtimeWebSocket } from 'openai/beta/realtime/websocket';
import { SessionService } from '../session/session.service';

import { AutomobileToolService } from './tools/automobile-tool.service';
import { ResponseStateService } from './response-state.service';

@WebSocketGateway({ path: '/ws/conversation' })
export class ConversationGateway implements OnGatewayInit {
  private readonly logger = new Logger(ConversationGateway.name);

  @WebSocketServer()
  server: WsServer;

  constructor(
    private readonly responseState: ResponseStateService,
    private readonly sessionService: SessionService,
    private readonly autoTool: AutomobileToolService,
  ) {}

  afterInit(server: WsServer) {
    server.on('connection', (socket: WebSocket, req: { url?: string }) => {
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

      this.sessionService.getContext(sessionId);
      const useOpenAI = process.env.USE_OPENAI_REALTIME === 'true';
      let rtClient: OpenAIRealtimeWebSocket | null = null;
      const pendingAudio: Buffer[] = [];

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
              instructions: `
      You are an AIgents Vehicle Support Assistant. Your sole purpose is to answer vehicle-related queries accurately and concisely, using only the information in your context or retrieved via the available tools. You MUST NOT hallucinate or provide information outside this scope.  

      When you need more data, invoke the appropriate tool:
        • search_automobile to look up vehicle listings
        • compare_automobile to compare specs of two or three models
        • news_automobiles to fetch the latest auto news

      If a tool call may take time, respond with:
        “Please wait a moment while I retrieve that information.”

      Always keep answers focused on vehicles and guide the user to wait or use the right tool when needed.
        `.trim(),
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
              tools: [
                {
                  name: 'search_automobile',
                  description: 'Search for automobiles given a text query',
                  parameters: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'Search terms for automobiles',
                      },
                      make: {
                        type: 'string',
                        description:
                          'Optional. Automobile make/brand to filter results',
                      },
                      model: {
                        type: 'string',
                        description:
                          'Optional. Automobile model to filter results',
                      },
                    },
                    required: ['query'],
                  },
                  type: 'function',
                },
                {
                  name: 'compare_automobile',
                  description:
                    'Compare specifications of two or three automobiles given a list of search terms',
                  parameters: {
                    type: 'object',
                    properties: {
                      items: {
                        type: 'array',
                        description:
                          'List of search items for automobiles (max 3)',
                        items: {
                          type: 'object',
                          properties: {
                            query: {
                              type: 'string',
                              description: 'Search terms for automobiles',
                            },
                            make: {
                              type: 'string',
                              description:
                                'Optional. Automobile make/brand to filter results',
                            },
                            model: {
                              type: 'string',
                              description:
                                'Optional. Automobile model to filter results',
                            },
                          },
                          required: ['query'],
                        },
                        maxItems: 3,
                      },
                    },
                    required: ['items'],
                  },
                  type: 'function',
                },
                {
                  name: 'news_automobiles',
                  description:
                    'Fetch latest automotive news matching a search query',
                  parameters: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'News search terms',
                      },
                      make: {
                        type: 'string',
                        description:
                          'Optional. Automobile make/brand to filter news',
                      },
                      model: {
                        type: 'string',
                        description:
                          'Optional. Automobile model to filter news',
                      },
                    },
                    required: ['query'],
                  },
                  type: 'function',
                },
              ],
            },
          });
          while (pendingAudio.length) {
            const buf = pendingAudio.shift()!;
            rtClient!.send({
              type: 'input_audio_buffer.append',
              audio: buf.toString('base64'),
            });
          }
        });

        let pendingFn: { call_id: string; name: string } | null = null;
        let argBuffer = '';
        this.responseState.setResponding(sessionId, false);

        rtClient.on('response.function_call_arguments.delta', (evt) => {
          argBuffer += (evt as any).delta;
        });
        rtClient.on('response.content_part.added', (evt) => {
          const { response_id, item_id, output_index, content_index } =
            evt as any;
          const deltaText = (evt as any).delta as string;
        });

        rtClient.on('response.content_part.done', (evt) => {});

        rtClient.on('response.function_call_arguments.done', async (evt) => {
          if (!pendingFn) return;
          let args: any;
          try {
            args = JSON.parse(argBuffer);
          } catch (e) {
            this.logger.error('Error parsing args', e);
            pendingFn = null;
            return;
          }

          // *** Aquí llamas a tu servicio de herramienta ***
          const { call_id, name } = pendingFn;
          switch (name) {
            case 'search_automobile':
              this.logger.log(`Call Tool search_automobile`);
              await this.autoTool.handleSearchFunctionCall(
                sessionId,
                call_id,
                args.query,
                rtClient!,
                args.make,
                args.model,
              );
              break;
            case 'compare_automobile':
              this.logger.log(`Call Tool compare_automobile`);
              await this.autoTool.handleCompareFunctionCall(
                sessionId,
                call_id,
                args.items,
                rtClient!,
              );
              break;
            case 'news_automobiles':
              this.logger.log(`Call Tool news_automobiles`);
              await this.autoTool.handleNewsFunctionCall(
                sessionId,
                call_id,
                args.query,
                rtClient!,
                args.make,
                args.model,
              );
              break;
            default:
              this.logger.error(`Unknown tool ${name}`);
          }

          // limpiamos para la próxima llamada
          pendingFn = null;
        });
        rtClient.on('response.done', () => {
          this.responseState.setResponding(sessionId, true);
        });

        // Handle realtime responses...
        rtClient.on('response.audio.delta', (evt) => {
          this.responseState.setResponding(sessionId, false);
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
        });
        rtClient!.on('conversation.item.created', async (evt) => {
          const item = (evt as any).item;
          // Sólo nos interesa cuando el LLM inicia una function_call
          if (item.type === 'function_call') {
            // Guardamos siempre el call_id y el name
            pendingFn = { call_id: item.call_id, name: item.name };
            // Vaciamos el buffer de argumentos para arrancar limpio
            argBuffer = '';
          }
        });
      }

      // 3) Recibimos todos los mensajes (esperamos solo audio binario)
      socket.on('message', (data) => {
        if (Buffer.isBuffer(data)) {
          const buf = data as Buffer;
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
