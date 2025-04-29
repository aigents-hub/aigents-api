import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { AIMessageChunk } from '@langchain/core/messages';

@Injectable()
export class NewsSearchAgent {
  private readonly logger = new Logger(NewsSearchAgent.name);
  private model: ChatOpenAI;
  private chain: RunnableSequence<{ query: string }, AIMessageChunk>;

  constructor(private configService: ConfigService) {}

  /**
   * Configura el modelo, el parser y el prompt para búsquedas de automóviles.
   */
  configure() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured.');

    this.model = new ChatOpenAI({
      model: 'gpt-4o-mini-search-preview',
      maxTokens: 1000,
      apiKey,
    });

    // Prompt con placeholder para instrucciones
    const prompt = ChatPromptTemplate.fromTemplate(`
  You are a news search assistant specialized exclusively in the automotive industry and automobiles.
  Only provide results strictly related to this topic.
  If the query is not about the automotive industry or automobiles, do not return any results.

  Query:
  "{query}"
    `);

    this.chain = RunnableSequence.from([prompt, this.model]);
  }

  /**
   * Ejecuta la búsqueda en web con el query dado.
   */
  async search(query: string): Promise<string> {
    this.logger.log(`🔍 Buscando web para: ${query}`);
    // Asegura que modelo y cadena estén inicializados
    this.configure();

    const response = await this.chain.invoke({ query });
    return response.content.toString();
  }
}
