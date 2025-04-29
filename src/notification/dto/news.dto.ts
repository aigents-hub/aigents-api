import { NewsArticle } from './../../models/news.model';

export class NewsDto implements NewsArticle {
  /** Título del artículo */
  title: string;
  /** URL de la fuente o publicación */
  sourceUrl: string;
  /** Resumen breve */
  summary: string;
  /** Texto extendido o contenido completo */
  content: string;

  constructor(data: NewsArticle) {
    this.title = data.title;
    this.sourceUrl = data.sourceUrl;
    this.summary = data.summary;
    this.content = data.content;
  }
}
