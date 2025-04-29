import { Logger } from '@nestjs/common';
import { StructureAutomobileAgent } from '../../agents/automobile/structure-automobile.agent';
import { GraphCommand } from '../routing-node';

export const StructureAutomobileNode =
  (logger: Logger, structureAgent: StructureAutomobileAgent) =>
  async (state: any): Promise<{ commands: GraphCommand[] }> => {
    const raw = state.searchResults;
    logger.log(`📦 Nodo StructureAutomobileNode con ${raw.length} items`);
    const structured = await structureAgent.structure(raw);
    return {
      ...state,
      structuredData: structured,
    };
  };
