import { Car, CarImage } from '../../models/car.model';

export class AutomobileDto implements Car {
  constructor(
    public id: string,
    public specs: Car['specs'],
    public images: CarImage[],
    public descriptionShort: Car['descriptionShort'],
    public descriptionLong: Car['descriptionLong'],
  ) {}
}
