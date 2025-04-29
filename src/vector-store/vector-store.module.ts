import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { AutomobileVectorStoreService } from './automobile.vector-store.service';

@Module({
  imports: [ConfigModule],
  providers: [EmbeddingsService, AutomobileVectorStoreService],
  exports: [AutomobileVectorStoreService],
})
export class VectorStoreModule {}
