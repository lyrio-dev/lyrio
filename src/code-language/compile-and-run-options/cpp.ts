import { IsIn } from "class-validator";

export default class CompileAndRunOptionsCpp {
  @IsIn(["g++", "clang++"])
  compiler: string;

  @IsIn(["c++03", "c++11", "c++14", "c++17", "c++20", "gnu++03", "gnu++11", "gnu++14", "gnu++17", "gnu++20"])
  std: string;

  @IsIn(["0", "1", "2", "3", "fast"])
  O: string;

  @IsIn(["64", "32", "x32"])
  m: string;
}
