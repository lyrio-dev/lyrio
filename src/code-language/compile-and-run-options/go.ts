import { IsIn } from "class-validator";

export default class CompileAndRunOptionsGo {
  @IsIn(["1.x"])
  version: string;
}
