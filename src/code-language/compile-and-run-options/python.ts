import { IsIn } from "class-validator";

export default class CompileAndRunOptionsPython {
  @IsIn(["2.7", "3.9", "3.10"])
  version: string;
}
