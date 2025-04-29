import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { RawNewsResult, NewsArticle } from '../../../models/news.model';

@Injectable()
export class StructureNewsAgent {
  private readonly logger = new Logger(StructureNewsAgent.name);
  private model!: ChatOpenAI;
  private chain!: RunnableSequence<
    { rawResults: RawNewsResult[]; format_instructions: string },
    NewsArticle[]
  >;

  constructor(private configService: ConfigService) {}

  configure() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured.');

    this.model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      apiKey,
    });

    const parser = this.createParser();

    const prompt = ChatPromptTemplate.fromTemplate(`
You are an assistant that transforms raw news search results into structured articles. For each input object with title, url, snippet, generate:

- summary: a concise technical summary.
- content: a more detailed explanation of the article, formatted in Markdown.

Input Raw Results:
{rawResults}

Desired Output Format:
{format_instructions}
    `);

    this.chain = RunnableSequence.from([prompt, this.model, parser]);
  }

  /**
   * Transforms raw news results into structured NewsArticle[]
   */
  async structure(rawResults: RawNewsResult[]): Promise<NewsArticle[]> {
    this.logger.log(`🔧 Structuring ${rawResults.length} raw results`);
    this.configure();

    const format_instructions = this.createParser().getFormatInstructions();
    const response = await this.chain.invoke({
      rawResults,
      format_instructions,
    });

    return response as NewsArticle[];
  }

  /**
   * Builds Zod schema parser for NewsArticle
   */
  private createParser() {
    const articleSchema = z.object({
      title: z.string().describe('Título del artículo'),
      sourceUrl: z.string().url().describe('URL de la fuente'),
      summary: z.string().describe('Resumen técnico breve'),
      content: z.string().describe('Contenido detallado en Markdown'),
    });

    const schema = z.array(articleSchema).describe('Lista de NewsArticle');
    return StructuredOutputParser.fromZodSchema(schema);
  }
}
