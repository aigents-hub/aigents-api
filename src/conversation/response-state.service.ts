import { Injectable } from '@nestjs/common';

@Injectable()
export class ResponseStateService {
  private state = new Map<string, boolean>();
  private waiters = new Map<string, Array<() => void>>();

  /** Llamar en response start/stop */
  setResponding(sessionId: string, responding: boolean) {
    this.state.set(sessionId, responding);

    if (!responding) {
      // resolvemos todos los waiters pendientes
      const list = this.waiters.get(sessionId) || [];
      list.forEach((cb) => cb());
      this.waiters.set(sessionId, []);
    }
  }

  /** Permite esperar hasta que responding===false */
  waitUntilNotResponding(sessionId: string): Promise<void> {
    const currently = this.state.get(sessionId);
    if (!currently) {
      // si ya está false o undefined, resolvemos al tiro
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const arr = this.waiters.get(sessionId) || [];
      arr.push(resolve);
      this.waiters.set(sessionId, arr);
    });
  }
}
