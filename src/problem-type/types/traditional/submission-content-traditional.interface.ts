import { IsString, Length, IsObject, IsBoolean, IsOptional } from "class-validator";

import { SubmissionContent } from "@/submission/submission-content.interface";

export class SubmissionContentTraditional implements SubmissionContent {
  @IsString()
  @Length(1, 20)
  language: string;

  @IsString()
  @Length(0, 1024 * 1024)
  code: string;

  @IsObject()
  languageOptions: unknown;

  @IsBoolean()
  @IsOptional()
  skipSamples?: boolean;
}
