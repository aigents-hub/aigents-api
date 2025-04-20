import { Body, Controller, Param, Post } from '@nestjs/common';
import { NotificationGateway } from '../notification/notification.gateway';

import { AutomobileDto } from '../notification/dto/automobile.dto';
import { ComparativaDto } from '../notification/dto/comparativa.dto';
import { ProveedoresDto } from '../notification/dto/proveedores.dto';

@Controller('execute')
export class ExecuteController {
  constructor(private readonly notification: NotificationGateway) {}

  @Post('automobile/:sessionId')
  executeAutomobile(
    @Param('sessionId') sessionId: string,
    @Body() dto: AutomobileDto,
  ) {
    this.notification.notifyAutomobile(sessionId, dto);
    return { status: `Automobile procesado para sesión ${sessionId}` };
  }

  @Post('comparativa/:sessionId')
  executeComparativa(
    @Param('sessionId') sessionId: string,
    @Body() dto: ComparativaDto,
  ) {
    this.notification.notifyComparativa(sessionId, dto);
    return { status: `Comparativa procesado para sesión ${sessionId}` };
  }

  @Post('proveedores/:sessionId')
  executeProveedores(
    @Param('sessionId') sessionId: string,
    @Body() dto: ProveedoresDto,
  ) {
    this.notification.notifyProveedores(sessionId, dto);
    return { status: `Proveedores procesado para sesión ${sessionId}` };
  }
}
