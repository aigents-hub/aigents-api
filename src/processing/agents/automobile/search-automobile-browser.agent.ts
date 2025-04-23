import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { Browser, chromium, Page } from 'playwright';

// Enum para evaluar relevancia del contenido
export enum CollectorRelevanceEnum {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// Resultado intermedio devuelto por el parser LLM
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
export interface ParsedAutomobileResult {
  brand: string;
  model: string;
  year: string;
  price?: string;
  specifications: Record<string, JSONValue>;
  relevance: CollectorRelevanceEnum;
}

// Estructura de cada resultado de búsqueda de Bing
export interface SiteResult {
  title: string;
  url: string;
  description: string;
  fileType: string | null;
}

@Injectable()
export class SearchAutomobileBrowserAgent {
  private readonly logger = new Logger(SearchAutomobileBrowserAgent.name);
  private model: ChatOpenAI;
  private chain: RunnableSequence<
    {
      value_search: string;
      listSitesResult: { iaText: string; results: SiteResult[] };
      format_instructions: string;
    },
    ParsedAutomobileResult[]
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
      maxTokens: 1000,
      apiKey,
    });

    const prompt = ChatPromptTemplate.fromTemplate(`
You are an assistant specialized in gathering and structuring information about real automobiles for sale in the United States.

User Query:
"{value_search}"

Bing Search Results (iaText and list of sites):
{listSitesResult}

From these search results, identify the most relevant vehicles, extract for each:
- brand
- model
- year
- price (if available)
- specifications (key-value pairs, values may be any JSON type)
- relevance (HIGH, MEDIUM, LOW)

Return a JSON array of objects matching the format instructions.

Format instructions:
{format_instructions}
    `);

    const parser = this.createParser();
    this.chain = RunnableSequence.from([prompt, this.model, parser]);
  }

  private createParser() {
    // Permite cualquier JSON como valor en specifications
    const schema = z
      .array(
        z.object({
          brand: z.string().describe('Marca del automóvil'),
          model: z.string().describe('Modelo'),
          year: z.string().describe('Año de fabricación o lanzamiento'),
          price: z
            .string()
            .optional()
            .describe('Precio de venta, si está disponible'),
          specifications: z
            .record(z.any())
            .describe('Especificaciones técnicas, valores de tipo JSON'),
          relevance: z
            .nativeEnum(CollectorRelevanceEnum)
            .describe('Nivel de relevancia'),
        }),
      )
      .describe('Lista de resultados estructurados de automóviles');

    return StructuredOutputParser.fromZodSchema(schema);
  }

  /**
   * Ejecuta la búsqueda y devuelve directamente el arreglo de resultados.
   */
  async search(value_search: string): Promise<ParsedAutomobileResult[]> {
    try {
      const listSitesResult = await this.searchBing(value_search);

      const response = await this.chain.invoke({
        value_search,
        listSitesResult,
        format_instructions: this.createParser().getFormatInstructions(),
      });

      return response as ParsedAutomobileResult[];
    } catch (error) {
      this.logger.error('Error en SearchAutomobileBrowserAgent.search', error);
      throw error;
    }
  }

  /**
   * Utiliza Bing para obtener IA summary y lista de sitios.
   */
  private async searchBing(
    query: string,
  ): Promise<{ iaText: string; results: SiteResult[] }> {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`${query} -pdf -reddit -facebook -twitter`)}`;
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
      function getFileType(url: string, captionText: string): string | null {
        const mapping: Record<string, string> = {
          pdf: 'application/pdf',
          doc: 'application/msword',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xls: 'application/vnd.ms-excel',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ppt: 'application/vnd.ms-powerpoint',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        const cleanUrl = url.split('?')[0].split('#')[0];
        const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';
        if (mapping[ext]) return mapping[ext];
        const match = captionText.match(/Archivo\s+(\w+)/i);
        return match ? mapping[match[1].toLowerCase()] || null : null;
      }

      const nodes = document.querySelectorAll('#b_results > li.b_algo');
      return Array.from(nodes)
        .map((node) => {
          const link = node.querySelector('h2 a');
          if (!link) return null;
          const url = link.getAttribute('href') || '';
          const title = link.textContent?.trim() || '';
          const descEl = node.querySelector('div.b_caption p');
          const description = descEl
            ? (descEl as HTMLElement).innerText.trim()
            : '';
          const attrEl = node.querySelector('div.b_attribution');
          const captionText = attrEl
            ? (attrEl as HTMLElement).innerText.trim()
            : '';
          const fileType = getFileType(url, captionText);
          return { title, url, description, fileType };
        })
        .filter((item): item is SiteResult => !!item);
    });

    return { iaText, results };
  }
}
