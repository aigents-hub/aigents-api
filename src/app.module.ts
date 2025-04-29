import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { SearchAutomobileModule } from './processing/search-automobile.module';
import { ImageModule } from './image/image.module';

import { ConversationModule } from './conversation/conversation.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    // Importa el módulo de imágenes
    ImageModule,
    // Importa el módulo de búsqueda de automóviles
    SearchAutomobileModule,
    // Importa el módulo de conversación
    ConversationModule,
    // Importa el módulo de sesión
    SessionModule,
  ],
})
export class AppModule {}
