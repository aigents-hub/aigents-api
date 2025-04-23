import { CarSpecs } from './car-specs.model';

/**
 * DTO para notificaciones o respuestas de búsqueda de automóviles.
 */
export interface Car {
  /** Objeto completo con todas las especificaciones del coche */
  specs: CarSpecs;
  /** URL de la imagen principal */
  mainImage: string;
  /** Descripción corta, por ejemplo para listados */
  descriptionShort: string;
  /** Descripción larga o detallada */
  descriptionLong: string;
}
