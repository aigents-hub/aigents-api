import { Module } from '@nestjs/common';
import { ConversationGateway } from './conversation.gateway';
import { AutomobileToolService } from './tools/automobile-tool.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { SessionModule } from '../session/session.module';
import { SearchAutomobileModule } from '../processing/search-automobile.module';
import { ExecuteController } from '../notification/execute.controller';
import { ResponseStateService } from './response-state.service';

@Module({
  imports: [VectorStoreModule, SessionModule, SearchAutomobileModule],
  providers: [
    ResponseStateService,
    ConversationGateway,
    AutomobileToolService,
    NotificationGateway,
    // …
  ],
  controllers: [ExecuteController],
})
export class ConversationModule {}
