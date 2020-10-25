import { IsIn } from "class-validator";

export default class CompileAndRunOptionsKotlin {
  @IsIn(["1.3", "1.4", "1.5"])
  version: string;

  @IsIn(["jvm"])
  platform: string;
}
