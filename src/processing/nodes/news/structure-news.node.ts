import { Logger } from '@nestjs/common';
import { StructureNewsAgent } from '../../agents/news/structure-news.agent';
import { NewsArticle, RawNewsResult } from '../../../models/news.model';

export const StructureNewsNode =
  (logger: Logger, structureNewsAgent: StructureNewsAgent) =>
  async (state: any): Promise<any> => {
    logger.log(
      `📝 Nodo StructureNewsNode, estructurando ${
        (state.rawResults as RawNewsResult[]).length
      } ítems`,
    );

    const articles: NewsArticle[] = await structureNewsAgent.structure(
      state.rawResults as RawNewsResult[],
    );

    return {
      ...state,
      articles,
    };
  };
