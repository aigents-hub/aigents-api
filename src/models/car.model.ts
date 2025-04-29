import { CarSpecs } from './car-specs.model';

/**
 * DTO para notificaciones o respuestas de búsqueda de automóviles.
 */
export interface Car {
  /** Identificador único (UUID) del automóvil */
  id: string;
  /** Objeto completo con todas las especificaciones del coche */
  specs: CarSpecs;
  /** Listado de imágenes del automóvil */
  images: CarImage[];
  /** Descripción corta, por ejemplo para listados */
  descriptionShort: string;
  /** Descripción larga o detallada */
  descriptionLong: string;
}

/**
 * Representa una imagen con URL y descripción.
 */
export interface CarImage {
  /** URL pública de la imagen */
  url: string;
  /** Texto descriptivo o alternativa */
  description: string;
}
