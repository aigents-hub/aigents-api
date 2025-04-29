import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, BaseCheckpointSaver } from '@langchain/langgraph';
import { AutomobileSearchSchema } from './automobile-search.schema';

import { AutomobileRoutingNode } from '../../nodes/routing-node';
import { SearchAutomobileNode } from '../../nodes/automobile/search-automobile.node';
import { StructureAutomobileNode } from '../../nodes/automobile/structure-automobile.node';
import { SearchAutomobileAgent } from '../../agents/automobile/search-automobile.agent';
import { StructureAutomobileAgent } from '../../agents/automobile/structure-automobile.agent';
import { AutomobileVectorStoreService } from '../../../vector-store/automobile.vector-store.service';
import { StoreAutomobileNode } from '../../nodes/automobile/store-automobile.node';

@Injectable()
export class AutomobileSearchWorkflow {
  private readonly logger = new Logger(AutomobileSearchWorkflow.name);

  constructor(
    private readonly searchAgent: SearchAutomobileAgent,
    private readonly structureAgent: StructureAutomobileAgent,
    private readonly vectorStore: AutomobileVectorStoreService,
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
      .addNode(
        'StoreAutomobileNode',
        StoreAutomobileNode(this.logger, this.vectorStore),
      )
      .addEdge('__start__', 'AutomobileRoutingNode')
      .addEdge('AutomobileRoutingNode', 'SearchAutomobileNode')
      .addEdge('SearchAutomobileNode', 'StructureAutomobileNode')
      .addEdge('StructureAutomobileNode', 'StoreAutomobileNode')
      .addEdge('StoreAutomobileNode', '__end__');

    return graph.compile({ checkpointer });
  }
}
