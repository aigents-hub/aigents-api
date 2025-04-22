import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, BaseCheckpointSaver } from '@langchain/langgraph';
import { AutomobileSearchSchema } from './automobile-search.schema';

import { AutomobileRoutingNode } from '../../nodes/routing-node';
import { SearchAutomobileNode } from '../../nodes/automobile/search-automobile.node';
import { StructureAutomobileNode } from '../../nodes/automobile/structure-automobile.node';
import { SearchAutomobileAgent } from '../../agents/automobile/search-automobile.agent';
import { StructureAutomobileAgent } from '../../agents/automobile/structure-automobile.agent';

@Injectable()
export class AutomobileSearchWorkflow {
  private readonly logger = new Logger(AutomobileSearchWorkflow.name);

  constructor(
    private readonly searchAgent: SearchAutomobileAgent,
    private readonly structureAgent: StructureAutomobileAgent,
  ) {}

  buildWorkflow(checkpointer?: false | BaseCheckpointSaver<number>) {
    const graph = new StateGraph(AutomobileSearchSchema)
      .addNode('AutomobileRoutingNode', AutomobileRoutingNode(this.logger))
      .addNode(
        'SearchAutomobileNode',
        SearchAutomobileNode(this.logger, this.searchAgent),
      )
      .addNode(
        'StructureAutomobileNode',
        StructureAutomobileNode(this.logger, this.structureAgent),
      )
      .addEdge('__start__', 'AutomobileRoutingNode')
      .addEdge('AutomobileRoutingNode', 'SearchAutomobileNode')
      .addEdge('SearchAutomobileNode', 'StructureAutomobileNode')
      .addEdge('StructureAutomobileNode', '__end__');

    return graph.compile({ checkpointer });
  }
}
