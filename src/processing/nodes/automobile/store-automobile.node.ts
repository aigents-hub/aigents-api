import { Logger } from '@nestjs/common';
import { Car } from '../../../models/car.model';
import { AutomobileVectorStoreService } from '../../../vector-store/automobile.vector-store.service';

export const StoreAutomobileNode =
  (logger: Logger, store: AutomobileVectorStoreService) =>
  async (state: any) => {
    const cars = state.structuredData as Car[];
    logger.log(`Persisting ${cars.length} cars`);
    await Promise.all(cars.map((c, i) => store.storeCar(c)));
    return state;
  };
