import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, BaseCheckpointSaver } from '@langchain/langgraph';
import { NewsSearchSchema } from './news-search.schema';
import { SearchNewsNode } from '../../nodes/news/search-news.node';
import { StructureNewsNode } from '../../nodes/news/structure-news.node';
import { NewsSearchAgent } from '../../agents/news/news-search.agent';
import { StructureNewsAgent } from '../../agents/news/structure-news.agent';

@Injectable()
export class NewsSearchWorkflow {
  private readonly logger = new Logger(NewsSearchWorkflow.name);

  constructor(
    private readonly newsSearchAgent: NewsSearchAgent,
    private readonly structureNewsAgent: StructureNewsAgent,
  ) {}

  buildWorkflow(checkpointer?: false | BaseCheckpointSaver<number>) {
    const graph = new StateGraph(NewsSearchSchema)
      .addNode(
        'SearchNewsNode',
        SearchNewsNode(this.logger, this.newsSearchAgent),
      )
      .addNode(
        'StructureNewsNode',
        StructureNewsNode(this.logger, this.structureNewsAgent),
      )
      .addEdge('__start__', 'SearchNewsNode')
      .addEdge('SearchNewsNode', 'StructureNewsNode')
      .addEdge('StructureNewsNode', '__end__');

    return graph.compile({ checkpointer });
  }
}
