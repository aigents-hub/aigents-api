export interface Specification {
  Horsepower: string;
  'Top Speed': string;
  '0-100 km/h': string;
  Engine: string;
}

export class AutomobileDto {
  items: {
    title: string;
    model: string;
    description: string;
    specs: Specification;
    image: string;
  }[];
}
