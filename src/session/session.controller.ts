import { Controller, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  /**
   * POST /session
   * Crea o recupera la sesión asociada a la IP cliente.
   * Devuelve { sessionId }.
   */
  @Post()
  create(@Req() req: Request, @Res() res: Response) {
    // Necesitamos la IP real; Express la expone en req.ip
    const clientIp = req.ip || req.socket.remoteAddress || '';
    if (!clientIp) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'No se pudo determinar la IP del cliente' });
    }

    const sessionId = this.sessions.createSessionForIp(clientIp);
    return res.status(HttpStatus.CREATED).json({ sessionId });
  }
}
