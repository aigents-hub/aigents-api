import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { Browser, chromium, Page } from 'playwright';
import { NewsArticle } from '../../../models/news.model';

// Estructura de cada resultado de búsqueda web
interface SiteResult {
  title: string;
  url: string;
  description: string;
  fileType: string | null;
}

@Injectable()
export class NewsSearchbrowserAgent {
  private readonly logger = new Logger(NewsSearchbrowserAgent.name);
  private model: ChatOpenAI;
  private chain: RunnableSequence<
    {
      value_search: string;
      listSitesResult: { iaText: string; results: SiteResult[] };
      format_instructions: string;
    },
    NewsArticle[]
  >;
  private browser: Browser;
  private page: Page;

  constructor(private configService: ConfigService) {
    void this.initializeBrowser();
    this.setupModelAndChain();
  }

  private async initializeBrowser() {
    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
  }

  private setupModelAndChain() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured.');

    this.model = new ChatOpenAI({
      model: 'gpt-4o-mini-search-preview',
      maxTokens: 2000,
      apiKey,
    });

    const prompt = ChatPromptTemplate.fromTemplate(`
You are an assistant specialized in gathering news articles strictly about the automotive industry. Output strictly valid JSON array; do not include any text outside the JSON. Only include up to 5 fully formed article objects; omit any incomplete entries. Do not include code fences, comments, or trailing commas.

User Query: "{value_search}"

Bing Search Results (IA summary and list of sites):
{listSitesResult}

For each of up to 5 items, extract:
- title
- sourceUrl
- summary (concise technical summary)
- content (detailed explanation in Markdown, without inline links)

Return a JSON array matching the format instructions.

Format instructions:
{format_instructions}
    `);

    const parser = this.createParser();
    this.chain = RunnableSequence.from([prompt, this.model, parser]);
  }

  private createParser() {
    const articleSchema = z.object({
      title: z.string().describe('Título del artículo'),
      sourceUrl: z.string().url().describe('URL de la fuente'),
      summary: z.string().describe('Resumen técnico breve'),
      content: z.string().describe('Contenido detallado en Markdown'),
    });
    const schema = z.array(articleSchema).describe('Lista de artículos');
    return StructuredOutputParser.fromZodSchema(schema);
  }

  async fetchRaw(query: string): Promise<NewsArticle[]> {
    this.logger.log(`Buscando noticias de automóvil para: ${query}`);
    const listSitesResult = await this.searchBing(query);

    try {
      const response = await this.chain.invoke({
        value_search: query,
        listSitesResult,
        format_instructions: this.createParser().getFormatInstructions(),
      });
      return response as NewsArticle[];
    } catch (e) {
      this.logger.error('Parsing failed, returning empty list', e);
      return [];
    }
  }

  private async searchBing(
    query: string,
  ): Promise<{ iaText: string; results: SiteResult[] }> {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(
      `${query} automotive industry -pdf -reddit -facebook -twitter`,
    )}`;
    await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('#b_results');

    let iaText = '';
    try {
      const spinner = await this.page.waitForSelector('#b_pole', {
        state: 'visible',
        timeout: 3000,
      });
      if (spinner) {
        await this.page.waitForSelector('#b_pole', {
          state: 'hidden',
          timeout: 10000,
        });
        iaText = await this.page.evaluate(() => {
          const box = document.querySelector('#b_pole');
          return box ? (box as HTMLElement).innerText.trim() : '';
        });
      }
    } catch {}

    const results = await this.page.evaluate(() => {
      function getFileType(url: string): string | null {
        const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
        return ext || null;
      }
      return Array.from(document.querySelectorAll('#b_results > li.b_algo'))
        .slice(0, 5)
        .map((node) => {
          const link = node.querySelector('h2 a');
          if (!link) return null;
          const url = link.getAttribute('href') || '';
          const title = link.textContent?.trim() || '';
          const descEl = node.querySelector('div.b_caption p');
          const description = descEl
            ? (descEl as HTMLElement).innerText.trim()
            : '';
          return { title, url, description, fileType: getFileType(url) };
        })
        .filter((item): item is SiteResult => !!item);
    });

    return { iaText, results };
  }
}
