import { IsIn } from "class-validator";

export default class CompileAndRunOptionsKotlin {
  @IsIn(["1.5", "1.6", "1.7", "1.8", "1.9"])
  version: string;

  @IsIn(["jvm"])
  platform: string;
}
