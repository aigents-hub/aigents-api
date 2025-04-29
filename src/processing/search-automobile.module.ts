import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchAutomobileAgent } from './agents/automobile/search-automobile.agent';
import { SearchAutomobileController } from './controllers/search-automobile.controller';
import { AutomobileSearchWorkflow } from './graphs/automobile/automobile-search.workflow';
import { StructureAutomobileAgent } from './agents/automobile/structure-automobile.agent';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { NewsSearchAgent } from './agents/news/news-search.agent';
import { StructureNewsAgent } from './agents/news/structure-news.agent';
import { NewsSearchController } from './controllers/news-search.controller';
import { NewsSearchWorkflow } from './graphs/news/news-search.workflow';

@Module({
  imports: [ConfigModule, VectorStoreModule],
  controllers: [SearchAutomobileController, NewsSearchController],
  providers: [
    // agentes necesarios para el workflow News
    NewsSearchAgent,
    StructureNewsAgent,
    NewsSearchWorkflow,
    // agentes necesarios para el workflow
    SearchAutomobileAgent,
    StructureAutomobileAgent,
    AutomobileSearchWorkflow,
  ],
  exports: [
    SearchAutomobileAgent,
    AutomobileSearchWorkflow,
    NewsSearchWorkflow,
  ],
})
export class SearchAutomobileModule {}
