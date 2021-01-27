import { Injectable } from "@nestjs/common";

import { ValidationError, validateSync } from "class-validator";
import { plainToClass } from "class-transformer";

import { CodeLanguage } from "./code-language.type";

import CompileAndRunOptionsCpp from "./compile-and-run-options/cpp";
import CompileAndRunOptionsC from "./compile-and-run-options/c";
import CompileAndRunOptionsJava from "./compile-and-run-options/java";
import CompileAndRunOptionsKotlin from "./compile-and-run-options/kotlin";
import CompileAndRunOptionsPascal from "./compile-and-run-options/pascal";
import CompileAndRunOptionsPython from "./compile-and-run-options/python";
import CompileAndRunOptionsRust from "./compile-and-run-options/rust";
import CompileAndRunOptionsSwift from "./compile-and-run-options/swift";
import CompileAndRunOptionsGo from "./compile-and-run-options/go";
import CompileAndRunOptionsHaskell from "./compile-and-run-options/haskell";
import CompileAndRunOptionsCSharp from "./compile-and-run-options/csharp";
import CompileAndRunOptionsFSharp from "./compile-and-run-options/fsharp";

const CompileAndRunOptionsClasses = {
  [CodeLanguage.Cpp]: CompileAndRunOptionsCpp,
  [CodeLanguage.C]: CompileAndRunOptionsC,
  [CodeLanguage.Java]: CompileAndRunOptionsJava,
  [CodeLanguage.Kotlin]: CompileAndRunOptionsKotlin,
  [CodeLanguage.Pascal]: CompileAndRunOptionsPascal,
  [CodeLanguage.Python]: CompileAndRunOptionsPython,
  [CodeLanguage.Rust]: CompileAndRunOptionsRust,
  [CodeLanguage.Swift]: CompileAndRunOptionsSwift,
  [CodeLanguage.Go]: CompileAndRunOptionsGo,
  [CodeLanguage.Haskell]: CompileAndRunOptionsHaskell,
  [CodeLanguage.CSharp]: CompileAndRunOptionsCSharp,
  [CodeLanguage.FSharp]: CompileAndRunOptionsFSharp
};

@Injectable()
export class CodeLanguageService {
  validateCompileAndRunOptions(language: CodeLanguage, compileAndRunOptions: unknown): ValidationError[] {
    return validateSync(plainToClass(CompileAndRunOptionsClasses[language], compileAndRunOptions), {
      whitelist: true,
      forbidNonWhitelisted: true
    });
  }
}
