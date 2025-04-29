import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Swagger configuration for the Aigents API.
 * This function sets up the Swagger UI for the API documentation.
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    // Project name as in the repo
    .setTitle('Aigents API')
    // Describe the purpose and context of the API
    .setDescription(
      'Backend for AI-powered vehicle acquisition agents.\n' +
        'Part of the Microsoft AI Agents Hackathon (Apr 8-30, 2025).',
    )
    // Semantic version of your API
    .setVersion('1.0')
    // (Optional) you can add grouped tags for major resources
    .addTag('agents', 'Operations around AI Agents')
    .addTag('vehicles', 'Vehicle-related queries')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Expose Swagger UI at /api-docs
  SwaggerModule.setup('api-docs', app, document);
}
