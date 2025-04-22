import { Car } from '../../models/car';

export class AutomobileDto {
  /**
   * El coche “puro” según tu modelo central
   */
  car: Car;

  /** URL de la imagen principal */
  mainImage: string;

  /** Descripción resumida (por ejemplo para listados) */
  descriptionShort: string;

  /** Descripción extensa (detalle interno) */
  descriptionLong: string;

  constructor(
    car: Car,
    mainImage: string,
    descriptionShort: string,
    descriptionLong: string,
  ) {
    this.car = car;
    this.mainImage = mainImage;
    this.descriptionShort = descriptionShort;
    this.descriptionLong = descriptionLong;
  }
}
