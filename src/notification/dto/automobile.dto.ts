import { Car, CarImage } from '../../models/car.model';

export class AutomobileDto implements Car {
  id: string;
  /**
   * Todas las especificaciones del coche, tal como en tu modelo central
   */
  specs: Car['specs'];

  /** URL de la imagen principal */
  images: CarImage[];

  /** Descripción corta (p.ej. para listados) */
  descriptionShort: Car['descriptionShort'];

  /** Descripción larga o detallada */
  descriptionLong: Car['descriptionLong'];

  constructor(car: Car) {
    this.id = car.id;
    this.specs = car.specs;
    this.images = car.images;
    this.descriptionShort = car.descriptionShort;
    this.descriptionLong = car.descriptionLong;
  }
}
