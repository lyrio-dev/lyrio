import { IsIn } from "class-validator";

export default class CompileAndRunOptionsRust {
  @IsIn(["2015", "2018", "2021"])
  version: string;

  @IsIn(["0", "1", "2", "3"])
  optimize: string;
}
