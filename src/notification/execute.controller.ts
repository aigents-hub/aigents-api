import { Body, Controller, Param, Post } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

import { AutomobileDto } from './dto/automobile.dto';
import { ComparisonDto } from './dto/comparison.dto';
import { ProvidersDto } from './dto/providers.dto';
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
    return { status: `Automobile processed for session ${sessionId}` };
  }

  @Post('comparison/:sessionId')
  executeComparison(
    @Param('sessionId') sessionId: string,
    @Body() dto: ComparisonDto,
  ) {
    this.notification.notifyComparison(sessionId, dto);
    return { status: `Comparison processed for session ${sessionId}` };
  }

  @Post('providers/:sessionId')
  executeProviders(
    @Param('sessionId') sessionId: string,
    @Body() dto: ProvidersDto,
  ) {
    this.notification.notifyProviders(sessionId, dto);
    return { status: `Providers processed for session ${sessionId}` };
  }

  @Post('news/:sessionId')
  executeNews(@Param('sessionId') sessionId: string, @Body() dto: NewsDto[]) {
    this.notification.notifyNews(sessionId, dto);
    return { status: `News processed for session ${sessionId}` };
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
