import { IsIn } from "class-validator";

export default class CompileAndRunOptionsSwift {
  @IsIn(["4.2", "5", "6"])
  version: string;

  @IsIn(["Onone", "O", "Ounchecked"])
  optimize: string;
}
