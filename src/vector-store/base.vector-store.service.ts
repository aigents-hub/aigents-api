import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { EmbeddingsService } from './embeddings/embeddings.service';

@Injectable()
export abstract class BaseVectorStoreService implements OnModuleInit {
  protected client: QdrantClient;
  protected readonly logger = new Logger(BaseVectorStoreService.name);

  constructor(
    protected config: ConfigService,
    protected embeddings: EmbeddingsService,
    /** Nombre de la colección en Qdrant */
    protected readonly collection: string,
    /** Dimensión de los vectores (por defecto 1536) */
    protected readonly vectorSize: number = 1536,
    /** Si debe crear índices de payload tras crear la colección */
    protected readonly createIndex = false,
  ) {}

  async onModuleInit() {
    const host = this.config.get<string>('QDRANT_HOST');
    const port = this.config.get<number>('QDRANT_PORT');
    const apiKey = this.config.get<string>('QDRANT_API_KEY');

    this.client = new QdrantClient({ url: `http://${host}:${port}`, apiKey });

    const exists = await this.client.collectionExists(this.collection);
    if (!exists.exists) {
      await this.client.createCollection(this.collection, {
        vectors: { size: this.vectorSize, distance: 'Cosine' },
      });
      this.logger.log(
        `Created collection "${this.collection}" (dim=${this.vectorSize})`,
      );
      if (this.createIndex) {
        await this.createPayloadIndex();
      }
    } else {
      this.logger.log(`Collection "${this.collection}" already exists`);
    }
  }

  protected abstract createPayloadIndex(): Promise<void>;

  protected async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddings.generate(text);
  }

  protected async upsert(
    id: string,
    vector: number[],
    payload: any,
  ): Promise<void> {
    await this.client.upsert(this.collection, {
      wait: true,
      points: [{ id, vector, payload }],
    });
    this.logger.log(`Upserted point ${id} → ${this.collection}`);
  }
}
