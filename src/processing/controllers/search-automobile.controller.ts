import { Controller, Post, Body } from '@nestjs/common';
import { SearchAutomobileAgent } from './../agents/automobile/search-automobile.agent';
import { AutomobileSearchWorkflow } from '../graphs/automobile/automobile-search.workflow';
import {
  AutomobileVectorStoreService,
  SearchResult,
} from '../../vector-store/automobile.vector-store.service';
import { Car } from './../../models/car.model';

@Controller('automobiles/search')
export class SearchAutomobileController {
  constructor(
    private readonly searchAutomobileAgent: SearchAutomobileAgent,
    private readonly automobileSearchWorkflow: AutomobileSearchWorkflow,
    private readonly vectorStore: AutomobileVectorStoreService, // ← inyectar servicio de vector DB
  ) {}

  @Post('agent')
  async searchAgent(@Body('query') query: string): Promise<string> {
    return this.searchAutomobileAgent.search(query);
  }

  @Post()
  async search(@Body('query') query: string): Promise<Car[]> {
    const runnable = this.automobileSearchWorkflow.buildWorkflow();
    const finalState = await runnable.invoke({ query });
    return finalState.structuredData;
  }

  // Nuevo endpoint para búsqueda vectorial directa
  @Post('vector')
  async searchVector(
    @Body('query') query: string,
    @Body('make') make?: string,
    @Body('model') model?: string,
    @Body('threshold') threshold = 0.0,
    @Body('limit') limit = 10,
    @Body('offset') offset = 0,
  ): Promise<SearchResult[]> {
    return this.vectorStore.searchCars(
      query,
      make,
      model,
      threshold,
      limit,
      offset,
    );
  }
}
