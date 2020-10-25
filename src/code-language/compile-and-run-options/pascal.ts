import { IsIn } from "class-validator";

export default class CompileAndRunOptionsPascal {
  @IsIn(["-", "1", "2", "3", "4"])
  optimize: string;
}
