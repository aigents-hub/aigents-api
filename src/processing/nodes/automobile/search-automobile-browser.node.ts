import { Logger } from '@nestjs/common';
import { GraphCommand } from '../routing-node';
import { SearchAutomobileBrowserAgent } from '../../agents/automobile/search-automobile-browser.agent';
import { CollectorRelevanceEnum } from '../../agents/automobile/search-automobile-browser.agent';

const MAX_RESULTS = 5;

export const SearchAutomobileBrowserNode =
  (logger: Logger, searchAgent: SearchAutomobileBrowserAgent) =>
  async (state: any): Promise<any> => {
    const query = state.query as string;
    logger.log(`🚗 Nodo SearchAutomobileBrowserNode, query="${query}"`);

    // 1) Invoca al agente y obtiene un array de resultados
    const allResults = (await searchAgent.search(query)) as unknown as Array<{
      relevance: CollectorRelevanceEnum;
      // ... otras propiedades como brand, model, etc.
    }>;

    // 2) Agrupa por relevancia
    const high = allResults.filter(
      (r) => r.relevance === CollectorRelevanceEnum.HIGH,
    );
    const medium = allResults.filter(
      (r) => r.relevance === CollectorRelevanceEnum.MEDIUM,
    );
    const low = allResults.filter(
      (r) => r.relevance === CollectorRelevanceEnum.LOW,
    );

    // 3) Selecciona hasta MAX_RESULTS siguiendo la prioridad HIGH > MEDIUM > LOW
    let selected = [] as typeof allResults;
    if (high.length >= MAX_RESULTS) {
      selected = high.slice(0, MAX_RESULTS);
    } else if (high.length + medium.length >= MAX_RESULTS) {
      selected = [...high, ...medium.slice(0, MAX_RESULTS - high.length)];
    } else {
      selected = [
        ...high,
        ...medium,
        ...low.slice(0, MAX_RESULTS - high.length - medium.length),
      ];
    }

    // 4) Devuelve el estado extendido con los resultados seleccionados
    return {
      ...state,
      searchResults: selected,
    };
  };
