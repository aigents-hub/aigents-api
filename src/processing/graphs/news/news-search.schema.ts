import { Annotation } from '@langchain/langgraph';
import { NewsArticle, RawNewsResult } from '../../../models/news.model';

export const NewsSearchSchema = Annotation.Root({
  query: Annotation<string>({
    default: () => '',
    value: (_, v) => v,
  }),
  rawResults: Annotation<RawNewsResult[]>({
    default: () => [],
    value: (_, v) => v,
  }),
  articles: Annotation<NewsArticle[]>({
    default: () => [],
    value: (_, v) => v,
  }),
});
