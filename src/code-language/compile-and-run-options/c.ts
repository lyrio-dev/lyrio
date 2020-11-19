import { IsIn } from "class-validator";

export default class CompileAndRunOptionsC {
  @IsIn(["gcc", "clang"])
  compiler: string;

  @IsIn(["c89", "c99", "c11", "c17", "gnu89", "gnu99", "gnu11", "gnu17"])
  std: string;

  @IsIn(["0", "1", "2", "3", "fast"])
  O: string;

  @IsIn(["64", "32", "x32"])
  m: string;
}
