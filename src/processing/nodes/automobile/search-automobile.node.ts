import { Logger } from '@nestjs/common';
import { SearchAutomobileAgent } from '../../agents/automobile/search-automobile.agent';
import { GraphCommand } from '../routing-node';

export const SearchAutomobileNode =
  (logger: Logger, searchAgent: SearchAutomobileAgent) =>
  async (state: any): Promise<{ commands: GraphCommand[] }> => {
    const query = state.query as string;
    logger.log(`🚗 Nodo SearchAutomobileNode, query="${query}"`);
    const results = await searchAgent.search(query);
    return {
      commands: [
        {
          type: 'StructureAutomobileNode',
          payload: { ...state, searchResults: results },
        },
      ],
    };
  };
