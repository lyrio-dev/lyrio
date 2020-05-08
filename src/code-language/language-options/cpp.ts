import { IsIn } from "class-validator";

export default class LanguageOptionsCpp {
  @IsIn(["g++", "clang++"])
  compiler: string;

  @IsIn(["c++03", "c++11", "c++14", "c++17"])
  std: string;

  @IsIn(["0", "1", "2", "3", "fast"])
  O: string;

  @IsIn(["64", "32", "x32"])
  m: string;
}
