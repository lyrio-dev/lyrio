import { Injectable } from "@nestjs/common";

import { ValidationError, validateSync } from "class-validator";
import { plainToClass } from "class-transformer";

import { CodeLanguage } from "./code-language.type";

import LanguageOptionsCpp from "./language-options/cpp";

const LanguageOptionsClasses = {
  [CodeLanguage.CPP]: LanguageOptionsCpp
};

@Injectable()
export class CodeLanguageService {
  validateLanguageOptions(language: CodeLanguage, languageOptions: unknown): ValidationError[] {
    return validateSync(plainToClass(LanguageOptionsClasses[language], languageOptions));
  }
}
