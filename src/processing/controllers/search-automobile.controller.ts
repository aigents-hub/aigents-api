import { Controller, Post, Body } from '@nestjs/common';
import { SearchAutomobileAgent } from './../agents/automobile/search-automobile.agent';
import { AutomobileSearchWorkflow } from '../graphs/automobile/automobile-search.workflow';

import { AutomobileDto } from './../dto/automobile.dto';

@Controller('automobiles/search')
export class SearchAutomobileController {
  constructor(
    private readonly searchAutomobileAgent: SearchAutomobileAgent,
    private readonly automobileSearchWorkflow: AutomobileSearchWorkflow,
  ) {}

  @Post('agent')
  async searchAgent(@Body('query') query: string): Promise<string> {
    return this.searchAutomobileAgent.search(query);
  }

  @Post()
  async search(@Body('query') query: string): Promise<AutomobileDto[]> {
    // 1) Construye y compila el grafo
    const runnable = this.automobileSearchWorkflow.buildWorkflow();

    // 2) Ejecuta con el estado inicial { query }
    const finalState = await runnable.invoke({ query });

    // 3) Devuelve sólo la parte estructurada del estado
    return finalState.structuredData;
  }
}
