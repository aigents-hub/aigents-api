import { Body, Controller, Param, Post } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

import { AutomobileDto } from './dto/automobile.dto';
import { ComparativaDto } from './dto/comparativa.dto';
import { ProveedoresDto } from './dto/proveedores.dto';
import { NewsDto } from './dto/news.dto';
import { SearchingDto } from './dto/searching.dto';

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

  @Post('news/:sessionId')
  executeNews(@Param('sessionId') sessionId: string, @Body() dto: NewsDto[]) {
    this.notification.notifyNews(sessionId, dto);
    return { status: `News procesado para sesión ${sessionId}` };
  }

  @Post('searching/:sessionId')
  executeSearching(
    @Param('sessionId') sessionId: string,
    @Body() dto: SearchingDto,
  ) {
    this.notification.notifySearching(sessionId, dto.searching);
    return { status: `Searching state processed for session ${sessionId}` };
  }
}
