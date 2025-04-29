import { Module } from '@nestjs/common';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { MinioService } from './minio.service';

@Module({
  providers: [ImageService, MinioService],
  controllers: [ImageController],
  exports: [ImageService],
})
export class ImageModule {}
