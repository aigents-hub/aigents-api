import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { setupSwagger } from './setup.swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  setupSwagger(app);

  app.useWebSocketAdapter(new WsAdapter(app));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  const host = configService.get<string>('HOST');

  if (!port) {
    throw new Error('PORT environment variable is not defined');
  }

  if (!host) {
    throw new Error('HOST environment variable is not defined');
  }

  await app.listen(port, host);
  logger.log(`🚀 Application is running on: http://${host}:${port}`);
  logger.log(`🕸️ WebSocket gateway listening at ws://${host}:${port}`);
}
bootstrap();
