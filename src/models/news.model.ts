export interface RawNewsResult {
  // p.ej. título, URL, extracto…
  title: string;
  url: string;
  snippet: string;
}

/**
 * Representa un artículo de noticia de automóvil.
 */
export interface NewsArticle {
  /** Título del artículo */
  title: string;
  /** URL de la fuente o publicación */
  sourceUrl: string;
  /** Resumen breve */
  summary: string;
  /** Texto extendido o contenido completo */
  content: string;
}
