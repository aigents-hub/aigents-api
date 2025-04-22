import { Annotation } from '@langchain/langgraph';
import { SearchResultDto, AutomobileDto } from '../../dto/automobile.dto';

export const AutomobileSearchSchema = Annotation.Root({
  query: Annotation<string>({
    default: () => '',
    value: (cur, v) => v,
  }),
  searchResults: Annotation<SearchResultDto[]>({
    default: () => [],
    value: (cur, v) => v,
  }),
  structuredData: Annotation<AutomobileDto[]>({
    default: () => [],
    value: (cur, v) => v,
  }),
});
