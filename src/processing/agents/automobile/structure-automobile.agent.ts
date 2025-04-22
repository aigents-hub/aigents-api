import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { SearchResultDto, AutomobileDto } from '../../dto/automobile.dto';

@Injectable()
export class StructureAutomobileAgent {
  private readonly logger = new Logger(StructureAutomobileAgent.name);
  private model: ChatOpenAI;
  private chain: RunnableSequence<
    { raw: SearchResultDto[]; format_instructions: string },
    AutomobileDto[]
  >;

  constructor(private configService: ConfigService) {}

  /**
   * Configura el modelo, el parser y el prompt para estructurar resultados.
   */
  configure() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured.');

    this.model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      apiKey,
    });

    // Zod schema para estructura detallada
    const autoSchema = z.array(
      z.object({
        title: z.string(),
        model: z.string(),
        year: z.string(),
        description: z.string(),
        specs: z.record(z.string(), z.string()),
        images: z.array(z.string().url()),
      }),
    );
    const parser = StructuredOutputParser.fromZodSchema(autoSchema);

    // Prompt con placeholder para instrucciones
    const prompt = ChatPromptTemplate.fromTemplate(`
Toma estos resultados de búsqueda de automóviles y conviértelos en un JSON refinado con:
- title, model, year, description, specs (mapa clave→valor), images (URLs).

Resultados:
{raw}

{format_instructions}
    `);

    this.chain = RunnableSequence.from([prompt, this.model, parser]);
  }

  /**
   * Estructura los resultados crudos en datos de AutomobileDto.
   */
  async structure(raw: SearchResultDto[]): Promise<AutomobileDto[]> {
    this.logger.log(`🔧 Estructurando ${raw.length} resultados`);
    // Inicializa configuración si es necesario
    this.configure();

    const format_instructions = (
      this.chain.steps[2] as StructuredOutputParser<any>
    ).getFormatInstructions();

    return this.chain.invoke({ raw, format_instructions });
  }
}
