import { Logger } from '@nestjs/common';

// Mínima definición de comando de grafo
export interface GraphCommand {
  type: string;
  payload: any;
}

/**
 * Nodo de enrutamiento para el sub-flujo de automóviles.
 * - Si existe state.query, despacha a SearchAutomobileNode.
 * - Si no, cierra el flujo con __end__.
 */
export const AutomobileRoutingNode =
  (logger: Logger) =>
  async (state: any): Promise<{ commands: GraphCommand[] }> => {
    const { query } = state;
    if (typeof query === 'string' && query.trim().length > 0) {
      logger.log(
        `🚦 Routing: encontrado query="${query}", yendo a SearchAutomobileNode`,
      );
      return {
        commands: [
          {
            type: 'SearchAutomobileNode',
            payload: { ...state },
          },
        ],
      };
    }

    logger.log('🚦 Routing: no se encontró query, finalizando flujo');
    return {
      commands: [
        {
          type: '__end__',
          payload: state,
        },
      ],
    };
  };
