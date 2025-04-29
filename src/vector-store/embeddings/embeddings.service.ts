import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private client: OpenAI;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured.');
    this.client = new OpenAI({ apiKey });
  }

  async generate(text: string): Promise<number[]> {
    const resp = await this.client.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
    });
    return resp.data[0].embedding;
  }
}
