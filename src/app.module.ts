import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { NotificationGateway } from './notification/notification.gateway';
import { ConversationGateway } from './conversation/conversation.gateway';
import { SessionService } from './session/session.service';

import { ExecuteController } from './execute/execute.controller';
import { SessionController } from './session/session.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [ExecuteController, SessionController],
  providers: [SessionService, ConversationGateway, NotificationGateway],
})
export class AppModule {}
