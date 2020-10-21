import { Injectable } from "@nestjs/common";

import { ValidationError, validateSync } from "class-validator";
import { plainToClass } from "class-transformer";

import { CodeLanguage } from "./code-language.type";

import CompileAndRunOptionsCpp from "./compile-and-run-options/cpp";

const CompileAndRunOptionsClasses = {
  [CodeLanguage.Cpp]: CompileAndRunOptionsCpp
};

@Injectable()
export class CodeLanguageService {
  validateCompileAndRunOptions(language: CodeLanguage, compileAndRunOptions: unknown): ValidationError[] {
    return validateSync(plainToClass(CompileAndRunOptionsClasses[language], compileAndRunOptions));
  }
}
