import { Logger } from '@nestjs/common';
import { NewsSearchAgent } from '../../agents/news/news-search.agent';

export const SearchNewsNode =
  (logger: Logger, newsSearchAgent: NewsSearchAgent) => async (state: any) => {
    const query: string = state.query;
    logger.log(`🔍 Nodo SearchNewsNode, query="${query}"`);

    const raw = await newsSearchAgent.search(query);

    return {
      ...state,
      rawResults: raw,
    };
  };
