import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchAutomobileAgent } from './agents/automobile/search-automobile.agent';
import { SearchAutomobileController } from './controllers/search-automobile.controller';
import { AutomobileSearchWorkflow } from './graphs/automobile/automobile-search.workflow';
import { StructureAutomobileAgent } from './agents/automobile/structure-automobile.agent';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { SearchAutomobileBrowserAgent } from './agents/automobile/search-automobile-browser.agent';

@Module({
  imports: [ConfigModule, VectorStoreModule],
  controllers: [SearchAutomobileController],
  providers: [
    // agentes necesarios para el workflow
    SearchAutomobileBrowserAgent,
    SearchAutomobileAgent,
    StructureAutomobileAgent,
    // tu workflow
    AutomobileSearchWorkflow,
  ],
  exports: [SearchAutomobileAgent, AutomobileSearchWorkflow],
})
export class SearchAutomobileModule {}
