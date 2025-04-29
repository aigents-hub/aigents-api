import { Annotation } from '@langchain/langgraph';
import { Car } from './../../../models/car.model';

export const AutomobileSearchSchema = Annotation.Root({
  query: Annotation<string>({
    default: () => '',
    value: (cur, v) => v,
  }),
  searchResults: Annotation<string>({
    default: () => '',
    value: (cur, v) => v,
  }),
  structuredData: Annotation<Car[]>({
    default: () => [],
    value: (cur, v) => v,
  }),
});
