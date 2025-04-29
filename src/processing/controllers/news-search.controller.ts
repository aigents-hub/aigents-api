import { Controller, Post, Body } from '@nestjs/common';
import { NewsSearchWorkflow } from '../graphs/news/news-search.workflow';
import { NewsArticle } from '../../models/news.model';

@Controller('news/search')
export class NewsSearchController {
  constructor(private readonly newsSearchWorkflow: NewsSearchWorkflow) {}

  @Post()
  async search(@Body('query') query: string): Promise<NewsArticle[]> {
    const runnable = this.newsSearchWorkflow.buildWorkflow();
    const finalState = await runnable.invoke({ query });
    return finalState.articles;
  }
}
