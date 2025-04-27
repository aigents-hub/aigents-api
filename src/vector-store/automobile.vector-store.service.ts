import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

import { BaseVectorStoreService } from './base.vector-store.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { Car } from '../models/car.model';

export interface SearchResult {
  id: string;
  score: number;
  car: Car;
}

@Injectable()
export class AutomobileVectorStoreService extends BaseVectorStoreService {
  constructor(cfg: ConfigService, embeddings: EmbeddingsService) {
    // colección = 'automobiles', dimensión = 3072, createIndex = true
    super(cfg, embeddings, 'automobiles', 3072, true);
  }

  protected async createPayloadIndex() {
    await this.client.createPayloadIndex(this.collection, {
      field_name: 'descriptionShort',
      field_schema: { type: 'text', tokenizer: 'word', lowercase: true },
    });
    this.logger.log('Indexed descriptionShort');
  }

  async storeCar(car: Car) {
    const id = uuidv4();
    const text = [
      car.specs.model,
      car.descriptionShort,
      car.descriptionLong,
    ].join(' ');
    const vec = await this.generateEmbedding(text);
    await this.upsert(id, vec, { car });
  }

  /**
   * Busca automóviles por texto (vector + filtro opcional).
   * @param query Texto libre para buscar (aplica embedding).
   * @param threshold Score mínimo para filtrar.
   * @param limit Máximo resultados a devolver.
   * @param offset Desplazamiento en paginación.
   */
  async searchCars(
    query: string,
    make?: string,
    model?: string,
    threshold = 0.4,
    limit = 1,
    offset = 0,
  ): Promise<SearchResult[]> {
    // 1) Generar embedding
    const queryVector = await this.generateEmbedding(query);

    // 2) Construir filtro estático
    let qdrantFilter: Record<string, unknown> | undefined = undefined;
    const mustClauses: any[] = [];

    if (make) {
      mustClauses.push({
        key: 'car.specs.make',
        match: { value: make },
      });
    }
    if (model) {
      mustClauses.push({
        key: 'car.specs.model',
        match: { value: model },
      });
    }
    if (mustClauses.length) {
      qdrantFilter = { must: mustClauses };
    }

    // 3) Ejecutar búsqueda vectorial + filtro
    const resp = await this.client.search(this.collection, {
      vector: queryVector,
      limit,
      offset,
      with_payload: true,
      score_threshold: threshold,
      filter: qdrantFilter,
    });

    // 4) Mapear resultados
    return resp.map((r) => ({
      id: r.id.toString(),
      score: r.score,
      car: (r.payload as any).car as Car,
    }));
  }
}
