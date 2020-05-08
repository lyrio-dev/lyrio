import { Module } from "@nestjs/common";

import { CodeLanguageService } from "./code-language.service";

@Module({
  providers: [CodeLanguageService],
  exports: [CodeLanguageService]
})
export class CodeLanguageModule {}
