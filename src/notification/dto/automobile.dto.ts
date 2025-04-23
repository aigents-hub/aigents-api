// src/notification/dto/automobile.dto.ts
import { Car } from '../../models/car.model';

export class AutomobileDto implements Car {
  /**
   * Todas las especificaciones del coche, tal como en tu modelo central
   */
  specs: Car['specs'];

  /** URL de la imagen principal */
  mainImage: Car['mainImage'];

  /** Descripción corta (p.ej. para listados) */
  descriptionShort: Car['descriptionShort'];

  /** Descripción larga o detallada */
  descriptionLong: Car['descriptionLong'];

  constructor(car: Car) {
    this.specs = car.specs;
    this.mainImage = car.mainImage;
    this.descriptionShort = car.descriptionShort;
    this.descriptionLong = car.descriptionLong;
  }
}
