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
Toma estos resultados de búsqueda de automóviles y conviértelos en un JSON refinado con las propiedades:
- car (objeto completo según tu modelo central)
- mainImage (URL)
- descriptionShort
- descriptionLong

Resultados crudos:
{raw}

Formato de salida deseado:
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
   * Devuelve un Zod schema para un array de AutomobileDto.
   * Cada propiedad está anotada con `.describe()` para detallar su significado.
   */
  private createParser() {
    const specsSchema = z
      .object({
        model: z.string().describe('Nombre del modelo, e.g. "Model 3"'),
        generation: z.string().optional().describe('Generación o revisión'),
        market: z.string().optional().describe('Mercado objetivo'),
        alsoKnownAs: z
          .array(z.string())
          .optional()
          .describe('Alias o nombres alternativos'),
        driveType: z.nativeEnum(DriveType).describe('Tipo de propulsión'),

        battery: z
          .object({
            capacity: z.string().describe('Capacidad en kWh'),
            tech: z.string().describe('Tecnología de la batería'),
            range: z.string().describe('Autonomía estimada'),
            consumption: z.string().describe('Consumo medio'),
            recuperation: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Recuperación de energía; null→undefined'),
            heatPump: z.boolean().describe('Incluye bomba de calor?'),
          })
          .optional()
          .nullable()
          .transform((v) => v ?? undefined)
          .describe(
            'Datos de batería para eléctricos e híbridos; puede ser null',
          ),

        combustion: z
          .object({
            fuelType: z.string().describe('Tipo de combustible'),
            displacement: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Cilindrada; null→undefined'),
            power: z.string().describe('Potencia máxima'),
            torque: z.string().describe('Torque máximo'),
            consumption: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Consumo medio; null→undefined'),
            emissions: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Emisiones CO₂; null→undefined'),
          })
          .optional()
          .nullable()
          .transform((v) => v ?? undefined)
          .describe('Datos del motor de combustión; puede ser null'),

        launch: z
          .object({
            announced: z.string().describe('Año de anuncio'),
            released: z.string().describe('Fecha de lanzamiento'),
          })
          .describe('Información de lanzamiento'),

        status: z.string().describe('Estado actual del coche'),

        basePrices: z
          .object({
            currency: z.string().describe('Código de la moneda'),
            amount: z
              .number()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Importe en la moneda especificada; null→undefined'),
          })
          .describe('Precio base'),

        performance: z
          .object({
            power: z.string().describe('Potencia'),
            torque: z.string().describe('Torque'),
            acceleration: z.string().describe('0–100 km/h'),
            maxSpeed: z.string().describe('Velocidad máxima'),
          })
          .describe('Prestaciones del vehículo'),

        body: z
          .object({
            type: z.string().describe('Tipo de carrocería'),
            seats: z.number().describe('Número de plazas'),
            platform: z.string().optional().describe('Plataforma base'),
          })
          .describe('Carrocería y asientos'),

        dimensions: z
          .object({
            length: z.string().describe('Largo total'),
            width: z.string().describe('Ancho total'),
            height: z.string().describe('Alto total'),
            dragCoefficient: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Coeficiente de arrastre; null→undefined'),
            wheelbase: z.string().describe('Distancia entre ejes'),
            clearance: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Altura libre al suelo; null→undefined'),
          })
          .describe('Dimensiones del vehículo'),

        weight: z
          .object({
            unladen: z.string().describe('Peso en vacío'),
            gross: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Peso bruto; null→undefined'),
          })
          .describe('Pesos'),

        suspension: z
          .object({
            front: z.string().describe('Suspensión delantera'),
            rear: z.string().describe('Suspensión trasera'),
          })
          .describe('Sistema de suspensión'),

        wheels: z
          .array(
            z
              .object({
                name: z.string().describe('Nombre de la llanta'),
                size: z.string().describe('Tamaño de la llanta'),
              })
              .describe('Especificaciones de la llanta'),
          )
          .describe('Llantas montadas'),

        cargo: z
          .object({
            trunk: z.string().describe('Volumen del maletero'),
            frunk: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Volumen del frunk; null→undefined'),
            towing: z
              .string()
              .optional()
              .nullable()
              .transform((v) => v ?? undefined)
              .describe('Capacidad de remolque; null→undefined'),
          })
          .describe('Espacios de carga'),

        displays: z
          .object({
            center: z.string().describe('Tamaño de la pantalla central'),
            driver: z.string().describe('Pantalla del conductor'),
            headUp: z.boolean().describe('HUD incluido?'),
          })
          .describe('Sistemas de visualización'),

        comfort: z
          .object({
            seats: z.string().describe('Tipo de asientos'),
            roof: z.string().describe('Tipo de techo'),
            parkingAids: z.string().describe('Ayudas al estacionamiento'),
            connectivity: z
              .string()
              .optional()
              .describe('Opciones de conectividad'),
          })
          .describe('Comodidades'),

        safety: z
          .object({
            airbags: z.string().describe('Airbags instalados'),
            drivingAids: z.string().describe('Asistencias a la conducción'),
            selfDriving: z.string().optional().describe('Nivel de autonomía'),
            crashTests: z
              .string()
              .optional()
              .describe('Resultados de crash tests'),
            dvr: z
              .boolean()
              .optional()
              .describe('Registro de conducción activo'),
          })
          .describe('Sistemas de seguridad'),
      })
      .describe('Esquema Zod para CarSpecs');

    const carDtoSchema = z
      .object({
        id: z
          .string()
          .uuid()
          .default(() => uuidv4())
          .describe('UUID generado automáticamente'),
        specs: specsSchema,
        images: z
          .array(
            z.object({
              url: z.string().url().default('').describe('URL de la imagen'),
              description: z
                .string()
                .optional()
                .default('')
                .describe('Texto alternativo'),
            }),
          )
          .default([])
          .describe('Lista de imágenes adicionales; por defecto vacía'),
        descriptionShort: z.string().describe('Texto corto descriptivo'),
        descriptionLong: z.string().describe('Texto largo detallado'),
      })
      .describe('DTO para notificaciones de automóviles');

    // 3) Array de DTOs
    const carListSchema = z
      .array(carDtoSchema)
      .describe('Array de objetos Car');

    return StructuredOutputParser.fromZodSchema(carListSchema);
  }
}
