import { IsString, Length, IsObject } from "class-validator";

export class SubmissionContentTraditional {
  @IsString()
  @Length(1, 20)
  language: string;

  @IsString()
  @Length(0, 1024 * 1024)
  code: string;

  @IsObject()
  languageOptions: unknown;
}
