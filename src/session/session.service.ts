import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export type SessionContext = {
  notifications: Map<string, Set<WebSocket>>;
  lastActivity: number;
};

@Injectable()
export class SessionService {
  private sessions = new Map<string, SessionContext>();
  private ipToSession = new Map<string, string>();

  private readonly PURGE_INTERVAL = 60_000;
  private readonly SESSION_TTL = 5 * 60_000;

  constructor() {
    setInterval(() => this.purgeStaleSessions(), this.PURGE_INTERVAL);
  }

  /**
   * Crea una nueva sesión para esta IP, o devuelve la existente.
   */
  createSessionForIp(ip: string): string {
    if (this.ipToSession.has(ip)) {
      const existing = this.ipToSession.get(ip)!;
      this.touch(existing);
      return existing;
    }
    const sessionId = uuidv4();
    this.ipToSession.set(ip, sessionId);
    this.sessions.set(sessionId, {
      notifications: new Map(),
      lastActivity: Date.now(),
    });
    return sessionId;
  }

  /**
   * Devuelve el set de sockets suscritos a un evento en una sesión
   */
  public getSubscribers(
    sessionId: string,
    event: string,
  ): Set<WebSocket> | undefined {
    const ctx = this.sessions.get(sessionId);
    return ctx?.notifications.get(event);
  }

  getContext(sessionId: string): SessionContext {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) throw new Error(`Session ${sessionId} no encontrada`);
    this.touch(sessionId);
    return ctx;
  }

  subscribe(sessionId: string, event: string, socket: WebSocket) {
    const ctx = this.getContext(sessionId);
    const set = ctx.notifications.get(event) ?? new Set();
    set.add(socket);
    ctx.notifications.set(event, set);
    this.touch(sessionId);
  }

  removeSocket(sessionId: string, socket: WebSocket) {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return;
    for (const subs of ctx.notifications.values()) {
      subs.delete(socket);
    }
    this.touch(sessionId);
  }

  /** Actualiza el timestamp de actividad */
  private touch(sessionId: string) {
    const ctx = this.sessions.get(sessionId);
    if (ctx) ctx.lastActivity = Date.now();
  }

  /** Borra todas las sesiones cuyo lastActivity se pase del TTL */
  private purgeStaleSessions() {
    const now = Date.now();
    for (const [sessionId, ctx] of this.sessions) {
      if (now - ctx.lastActivity > this.SESSION_TTL) {
        this.sessions.delete(sessionId);
        // también quitamos la IP asociada
        for (const [ip, id] of this.ipToSession) {
          if (id === sessionId) this.ipToSession.delete(ip);
        }
        // opcional: logger
        // console.log(`Purgada sesión inactiva ${sessionId}`);
      }
    }
  }
}
