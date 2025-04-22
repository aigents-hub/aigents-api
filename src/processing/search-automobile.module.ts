import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchAutomobileAgent } from './agents/automobile/search-automobile.agent';
import { SearchAutomobileController } from './controllers/search-automobile.controller';
import { AutomobileSearchWorkflow } from './graphs/automobile/automobile-search.workflow';
import { StructureAutomobileAgent } from './agents/automobile/structure-automobile.agent';

@Module({
  imports: [ConfigModule],
  controllers: [SearchAutomobileController],
  providers: [
    // agentes necesarios para el workflow
    SearchAutomobileAgent,
    StructureAutomobileAgent,
    // tu workflow
    AutomobileSearchWorkflow,
  ],
  exports: [SearchAutomobileAgent, AutomobileSearchWorkflow],
})
export class SearchAutomobileModule {}
