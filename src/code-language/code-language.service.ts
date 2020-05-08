import { Injectable } from "@nestjs/common";
import { ValidationError, validateSync } from "class-validator";
import { plainToClass } from "class-transformer";

import { CodeLanguage } from "./code-language.type";

const LanguageOptionsClasses = {
  [CodeLanguage.CPP]: require("./language-options/cpp").default
};

@Injectable()
export class CodeLanguageService {
  validateLanguageOptions(language: CodeLanguage, languageOptions: unknown): ValidationError[] {
    console.log(LanguageOptionsClasses[language], languageOptions);
    return validateSync(plainToClass(LanguageOptionsClasses[language], languageOptions));
  }
}
