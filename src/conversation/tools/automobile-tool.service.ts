import { Injectable, Logger } from '@nestjs/common';
import { OpenAIRealtimeWebSocket } from 'openai/beta/realtime/websocket';

import { Car } from './../../models/car.model';
import { AutomobileVectorStoreService } from '../../vector-store/automobile.vector-store.service';
import { NotificationGateway } from '../../notification/notification.gateway';
import { AutomobileSearchWorkflow } from '../../processing/graphs/automobile/automobile-search.workflow';
import { ResponseStateService } from '../response-state.service';

@Injectable()
export class AutomobileToolService {
  private readonly logger = new Logger(AutomobileToolService.name);

  constructor(
    private readonly responseState: ResponseStateService,
    private readonly vectorStore: AutomobileVectorStoreService,
    private readonly notification: NotificationGateway,
    private readonly workflow: AutomobileSearchWorkflow,
  ) {}

  async handleSearchFunctionCall(
    sessionId: string,
    call_id: string,
    query: string,
    rtClient: OpenAIRealtimeWebSocket,
    make?: string,
    model?: string,
  ) {
    // 1) Intento rápido
    const quickResults = await this.vectorStore.searchCars(query, make, model);

    if (quickResults.length > 0) {
      const { id, car } = quickResults[0];
      const dto: Car = {
        ...car,
        id,
      };
      this.logger.log(`cars I found: ${dto.id}`);
      rtClient.send({
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
          voice: 'alloy',
          output_audio_format: 'pcm16',
          instructions: 'Here are the cars I found immediately.',
        },
      });
      rtClient.send({
        type: 'conversation.item.create',
        item: {
          id: `item_${call_id}`,
          type: 'function_call_output',
          call_id,
          output: JSON.stringify(dto.descriptionLong),
        },
      });
      this.notification.notifyAutomobile(sessionId, dto);
      return;
    }

    this.logger.log(`No immediate matches.`);

    rtClient.send({
      type: 'conversation.item.create',
      item: {
        id: `item_${call_id}`,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'No immediate matches. Running a deeper search, please hold on…',
          },
        ],
      },
    });

    rtClient.send({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        voice: 'alloy',
        output_audio_format: 'pcm16',
      },
    });

    const waitForLLM = this.responseState.waitUntilNotResponding(sessionId);

    this.workflow
      .buildWorkflow()
      .invoke({ query })
      .then(async (finalState) => {
        const deepResults = finalState.structuredData;
        this.logger.log(
          `cars I found with the deeper search: ${deepResults[0].id}`,
        );

        await waitForLLM;

        const dto: Car = {
          ...deepResults[0],
        };

        rtClient.send({
          type: 'conversation.item.create',
          item: {
            id: `item_${call_id}`,
            type: 'function_call_output',
            call_id,
            output: JSON.stringify(dto.descriptionLong),
          },
        });

        this.notification.notifyAutomobile(sessionId, dto);
      })
      .catch((err) => this.logger.error('Workflow error', err));
  }
}
