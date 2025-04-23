import { CarSpecs } from '../../models/car-specs.model';

export class AutomobileDto {
  /**
   * El coche “puro” según tu modelo central
   */
  car: CarSpecs;

  /** URL de la imagen principal */
  mainImage: string;

  /** Descripción resumida (por ejemplo para listados) */
  descriptionShort: string;

  /** Descripción extensa (detalle interno) */
  descriptionLong: string;

  constructor(
    car: CarSpecs,
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
