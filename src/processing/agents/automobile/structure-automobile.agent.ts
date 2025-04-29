import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { Car } from '../../../models/car.model';
import { DriveType } from '../../../models/car-specs.model';

@Injectable()
export class StructureAutomobileAgent {
  private readonly logger = new Logger(StructureAutomobileAgent.name);
  private model!: ChatOpenAI;
  private chain!: RunnableSequence<
    { raw: string; format_instructions: string },
    Car[]
  >;

  constructor(private configService: ConfigService) {}

  configure() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured.');

    this.model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      apiKey,
    });

    // Parser a partir del esquema Zod anotado
    const parser = this.createParser();

    const prompt = ChatPromptTemplate.fromTemplate(`
      Take these car search results and convert them into a refined JSON with the following properties:
      - car (full object according to your central model)
      - mainImage (URL)
      - descriptionShort
      - descriptionLong
      
      Raw results:
      {raw}
      
      Desired output format:
      {format_instructions}
      `);

    this.chain = RunnableSequence.from([prompt, this.model, parser]);
  }

  async structure(raw: string): Promise<Car[]> {
    this.logger.log(`🔧 Estructurando ${raw.length} resultados`);
    this.configure();

    const format_instructions = this.createParser().getFormatInstructions();

    const cars = await this.chain.invoke({ raw, format_instructions });

    cars.forEach((car) => {
      car.id = uuidv4();
    });

    return cars;
  }

  /**
   * Returns a Zod schema for an array of AutomobileDto.
   * Each property is annotated with `.describe()` to detail its meaning.
   */
  private createParser() {
    const optionalString = () =>
      z
        .string()
        .optional()
        .nullable()
        .transform((v) => v ?? undefined)
        .describe('string or null/undefined');

    const specsSchema = z
      .object({
        model: z.string().describe('Name of the model'),
        generation: optionalString().describe('Generation'),
        market: optionalString().describe('Target market'),
        alsoKnownAs: z.array(z.string()).optional().describe('Aliases…'),
        driveType: z.nativeEnum(DriveType).describe('Drive type'),

        battery: z
          .object({
            capacity: z.string().describe('Capacity in kWh'),
            tech: z.string().describe('Battery technology'),
            range: z.string().describe('Range'),
            consumption: optionalString().describe('Average consumption'),
            recuperation: optionalString().describe('Regeneration'),
            heatPump: z.boolean().describe('Includes heat pump?'),
          })
          .optional()
          .nullable()
          .transform((v) => v ?? undefined)
          .describe('Battery data'),

        combustion: z
          .object({
            fuelType: z.string().describe('Fuel type'),
            displacement: optionalString().describe('Displacement'),
            power: optionalString().describe('Power'),
            torque: optionalString().describe('Torque'),
            consumption: optionalString().describe('Average consumption'),
            emissions: optionalString().describe('CO₂ emissions'),
          })
          .optional()
          .nullable()
          .transform((v) => v ?? undefined)
          .describe('Combustion engine data'),

        launch: z
          .object({
            announced: z.string().describe('Year announced'),
            released: optionalString().describe('Release date'),
          })
          .describe('Launch information'),

        status: z.string().describe('Current status'),

        basePrices: z
          .object({
            currency: z.string().describe('Currency code'),
            amount: z
              .number()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined),
          })
          .describe('Base price'),

        performance: z
          .object({
            power: optionalString().describe('Power'),
            torque: optionalString().describe('Torque'),
            acceleration: optionalString().describe('0–100 km/h'),
            maxSpeed: optionalString().describe('Top speed'),
          })
          .describe('Performance'),

        body: z
          .object({
            type: z.string().describe('Body type'),
            seats: z.number().describe('Seats'),
            platform: optionalString().describe('Platform'),
          })
          .describe('Body and seats'),

        dimensions: z
          .object({
            length: optionalString().describe('Length'),
            width: optionalString().describe('Width'),
            height: optionalString().describe('Height'),
            dragCoefficient: optionalString().describe('Drag coefficient'),
            wheelbase: optionalString().describe('Wheelbase'),
            clearance: optionalString().describe('Ground clearance'),
          })
          .describe('Dimensions'),

        weight: z
          .object({
            unladen: optionalString().describe('Unladen weight'),
            gross: optionalString().describe('Gross weight'),
          })
          .describe('Weights'),

        suspension: z
          .object({
            front: optionalString().describe('Front'),
            rear: optionalString().describe('Rear'),
          })
          .describe('Suspension'),

        wheels: z
          .array(
            z
              .object({
                name: z.string().describe('Wheel name'),
                size: optionalString().describe('Size'),
              })
              .describe('Wheel'),
          )
          .describe('Wheels'),

        cargo: z
          .object({
            trunk: optionalString().describe('Trunk'),
            frunk: optionalString().describe('Frunk'),
            towing: optionalString().describe('Towing capacity'),
          })
          .describe('Cargo spaces'),

        displays: z
          .object({
            center: optionalString().describe('Center display'),
            driver: optionalString().describe('Driver display'),
            headUp: z.boolean().describe('HUD'),
          })
          .describe('Displays'),

        comfort: z
          .object({
            seats: optionalString().describe('Seat type'),
            roof: optionalString().describe('Roof'),
            parkingAids: optionalString().describe('Parking aids'),
            connectivity: optionalString().describe('Connectivity'),
          })
          .describe('Comfort features'),

        safety: z
          .object({
            airbags: optionalString().describe('Airbags'),
            drivingAids: optionalString().describe('Driving aids'),
            selfDriving: optionalString().describe('Autonomy level'),
            crashTests: optionalString().describe('Crash tests'),
            dvr: z.boolean().optional().describe('DVR'),
          })
          .describe('Safety'),
      })
      .describe('Zod schema for CarSpecs');

    const carDtoSchema = z
      .object({
        id: z
          .string()
          .uuid()
          .default(() => uuidv4())
          .describe('UUID'),
        specs: specsSchema,
        images: z
          .array(
            z.object({
              url: z.string().url().default('').describe('URL'),
              description: z.string().default('').describe('Alt text'),
            }),
          )
          .default([]),
        descriptionShort: z.string().describe('Short description'),
        descriptionLong: z.string().describe('Long description'),
      })
      .describe('DTO schema');

    return StructuredOutputParser.fromZodSchema(z.array(carDtoSchema));
  }
}
