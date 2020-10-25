import { IsIn } from "class-validator";

export default class CompileAndRunOptionsPython {
  @IsIn(["2.7", "3.6", "3.9"])
  version: string;
}
