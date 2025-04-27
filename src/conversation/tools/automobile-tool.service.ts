import { NewsDto } from './../../notification/dto/news.dto';
import { NewsSearchWorkflow } from './../../processing/graphs/news/news-search.workflow';
import { ComparisonDto } from '../../notification/dto/comparison.dto';
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
    private readonly newsSearchWorkflow: NewsSearchWorkflow,
  ) {}

  /**
   * Handles the search_automobile function call
   */
  async handleSearchFunctionCall(
    sessionId: string,
    call_id: string,
    query: string,
    rtClient: OpenAIRealtimeWebSocket,
    make?: string,
    model?: string,
  ) {
    // 1) Quick lookup in vector store
    const quickResults = await this.vectorStore.searchCars(query, make, model);

    if (quickResults.length > 0) {
      const { id, car } = quickResults[0];
      const dto: Car = { ...car, id };
      this.logger.log(`Found car immediately: ${dto.id}`);

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

    this.logger.log('No immediate matches.');
    // Notify front-end that a deeper search is in progress
    this.notification.notifySearching(sessionId, true);
    const waitForLLM = this.responseState.waitUntilNotResponding(sessionId);

    this.workflow
      .buildWorkflow()
      .invoke({ query })
      .then(async (finalState) => {
        const deepResults = finalState.structuredData;
        this.logger.log(`Found car with deeper search: ${deepResults[0].id}`);

        await waitForLLM;
        const dto: Car = { ...deepResults[0] };

        // Stop "searching" indicator
        this.notification.notifySearching(sessionId, false);

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
      .catch((err) => this.logger.error('Deep search workflow error', err));
  }

  /**
   * Handles the compare_automobile function call
   */
  async handleCompareFunctionCall(
    sessionId: string,
    call_id: string,
    items: Array<{ query: string; make?: string; model?: string }>,
    rtClient: OpenAIRealtimeWebSocket,
  ) {
    // 1) Perform quick search for each item
    const resultsLists = await Promise.all(
      items.map((item) =>
        this.vectorStore.searchCars(item.query, item.make, item.model),
      ),
    );

    // 2) Build array of Car from the first result of each search
    const cars: Car[] = resultsLists
      .map((res, idx) => {
        if (res.length > 0) {
          const { id, car } = res[0];
          return { ...car, id };
        }
        this.logger.warn(`No match for "${items[idx].query}"`);
        return null;
      })
      .filter((c): c is Car => c !== null);

    // 3) Send comparison notification to subscribed clients
    const dto = new ComparisonDto(cars);
    this.notification.notifyComparison(sessionId, dto);

    // 4) Respond to the LLM with the comparison payload
    rtClient.send({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        voice: 'alloy',
        output_audio_format: 'pcm16',
        instructions: 'Here is the comparison of the requested automobiles.',
      },
    });
    rtClient.send({
      type: 'conversation.item.create',
      item: {
        id: `item_${call_id}`,
        type: 'function_call_output',
        call_id,
        output: JSON.stringify({ cars: dto.cars }),
      },
    });
  }

  /**
   * Handles the news_automobiles function call
   */
  async handleNewsFunctionCall(
    sessionId: string,
    call_id: string,
    query: string,
    rtClient: OpenAIRealtimeWebSocket,
    make?: string,
    model?: string,
  ) {
    // 1) Notify front-end that news search has started
    this.notification.notifySearching(sessionId, true);

    // 2) Execute the news search workflow
    let finalState;
    try {
      const runnable = this.newsSearchWorkflow.buildWorkflow();
      finalState = await runnable.invoke({ query });
    } catch (err) {
      this.logger.error('News search workflow error', err);
      // Turn off the searching indicator
      this.notification.notifySearching(sessionId, false);
      // Inform the LLM of the error
      rtClient.send({
        type: 'response.create',
        response: {
          modalities: ['text'],
          instructions:
            'Sorry, an error occurred while searching for automotive news.',
        },
      });
      return;
    }

    // 3) News search completed
    this.notification.notifySearching(sessionId, false);

    // 4) Extract articles and notify front-end
    const articles: NewsDto[] = finalState.articles;

    // 5) Respond to the LLM with the news payload
    rtClient.send({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        voice: 'alloy',
        output_audio_format: 'pcm16',
        instructions: 'Here are the latest automotive news articles I found.',
      },
    });
    rtClient.send({
      type: 'conversation.item.create',
      item: {
        id: `item_${call_id}`,
        type: 'function_call_output',
        call_id,
        output: JSON.stringify({ articles }),
      },
    });
    this.notification.notifyNews(sessionId, articles);
  }
}
