import { IsString, Length, IsObject, IsBoolean, IsOptional, IsEnum } from "class-validator";

import { SubmissionContent } from "@/submission/submission-content.interface";
import { CodeLanguage } from "@/code-language/code-language.type";

export class SubmissionContentTraditional implements SubmissionContent {
  @IsString()
  @IsEnum(CodeLanguage)
  language: CodeLanguage;

  @IsString()
  @Length(0, 1024 * 1024)
  code: string;

  @IsObject()
  compileAndRunOptions: unknown;

  @IsBoolean()
  @IsOptional()
  skipSamples?: boolean;
}
