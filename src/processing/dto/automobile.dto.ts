export interface SearchResultDto {
  title: string;
  url: string;
  snippet: string;
}

export interface AutomobileDto {
  title: string;
  model: string;
  year: string;
  description: string;
  specs: Record<string, string>;
  images: string[];
}
