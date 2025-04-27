import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server as WsServer, WebSocket } from 'ws';
import { SessionService } from '../session/session.service';
import { SessionEvent } from './session-event.enum';

import { AutomobileDto } from './dto/automobile.dto';
import { ComparisonDto } from './dto/comparison.dto';
import { ProvidersDto } from './dto/providers.dto';
import { NewsDto } from './dto/news.dto';

type IncomingMsg =
  | { action: 'init'; sessionId: string }
  | { action: 'subscribe'; event: SessionEvent };

@WebSocketGateway({ path: '/ws/notification', cors: { origin: '*' } })
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer() server: WsServer;

  constructor(private readonly sessionService: SessionService) {}

  /** 1) Cuando el servidor arranca */
  afterInit(server: WsServer) {
    this.logger.log('NotificationGateway ready (ws://…/ws/notification)');
  }

  /** 2) Cuando se conecta un cliente */
  handleConnection(socket: WebSocket) {
    let sessionId: string | null = null;
    this.logger.log('Client connected (notification)');

    socket.on('message', (raw) => {
      let msg: IncomingMsg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        this.logger.warn('Mensaje inválido (no JSON)');
        return;
      }

      if (msg.action === 'init') {
        sessionId = msg.sessionId;
        socket.send(JSON.stringify({ type: 'initialized', sessionId }));
        this.logger.log(`Session initialized: ${sessionId}`);
      } else if (msg.action === 'subscribe' && sessionId) {
        this.sessionService.subscribe(sessionId, msg.event, socket);
        socket.send(JSON.stringify({ type: 'subscribed', event: msg.event }));
        this.logger.log(
          `Subscribed socket to event ${msg.event} for session ${sessionId}`,
        );
      }
    });

    socket.on('close', () => {
      if (sessionId) {
        this.sessionService.removeSocket(sessionId, socket);
        this.logger.log(`Socket closed for session ${sessionId}`);
      }
    });
  }

  handleDisconnect(socket: WebSocket) {
    this.logger.log('Client disconnected');
  }

  /** 3) Métodos públicos bien tipados */
  public notifyAutomobile(sessionId: string, dto: AutomobileDto) {
    this._notifySession(SessionEvent.Automobile, sessionId, { ...dto });
  }

  public notifyComparison(sessionId: string, dto: ComparisonDto) {
    this._notifySession(SessionEvent.Comparison, sessionId, {
      cars: dto.cars,
    });
  }

  public notifyProviders(sessionId: string, dto: ProvidersDto) {
    this._notifySession(SessionEvent.Providers, sessionId, {
      providers: dto.providers,
    });
  }

  /** Notifica un artículo de noticias */
  public notifyNews(sessionId: string, dto: NewsDto[]) {
    this._notifySession(SessionEvent.News, sessionId, { ...dto });
  }

  /**
   * Notifica el estado de búsqueda (true/false)
   */
  public notifySearching(sessionId: string, isSearching: boolean) {
    this._notifySession(SessionEvent.Searching, sessionId, {
      searching: isSearching,
    });
  }

  /** Compatibilidad con handleEvent */
  public handleEvent(event: SessionEvent, sessionId: string, payload: any) {
    switch (event) {
      case SessionEvent.Automobile:
        return this.notifyAutomobile(sessionId, payload);
      case SessionEvent.Comparison:
        return this.notifyComparison(sessionId, payload);
      case SessionEvent.Providers:
        return this.notifyProviders(sessionId, payload);
      case SessionEvent.News:
        return this.notifyNews(sessionId, payload);
      case SessionEvent.Searching:
        return this.notifySearching(sessionId, payload.searching);
      default:
        this.logger.error(`Evento no soportado en gateway: ${event}`);
    }
  }

  /** Función interna genérica */
  private _notifySession(event: SessionEvent, sessionId: string, body: any) {
    const subs = this.sessionService.getSubscribers(sessionId, event);
    if (!subs) {
      this.logger.warn(`No subscribers for ${event} / session ${sessionId}`);
      return;
    }
    const msg = JSON.stringify({ event, payload: body });
    subs.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
    this.logger.log(
      `Notified ${subs.size} sockets of ${event} in session ${sessionId}`,
    );
  }
}
