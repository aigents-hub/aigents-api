import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';

@Module({
  imports: [ConfigModule],
  providers: [SessionService],
  exports: [SessionService],
  controllers: [SessionController],
})
export class SessionModule {}
