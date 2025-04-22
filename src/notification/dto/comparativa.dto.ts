import { AutomobileDto } from './automobile.dto';

export class ComparativaDto {
  /**
   * Hasta 3 automóviles para comparar.
   * Reutiliza exactamente la misma estructura que en AutomobileDto.
   */
  cars: AutomobileDto[];

  constructor(cars: AutomobileDto[]) {
    if (cars.length > 3) {
      throw new Error('Solo se permiten hasta 3 automóviles en la comparativa');
    }
    this.cars = cars;
  }
}
