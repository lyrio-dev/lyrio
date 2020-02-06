import { IsString, Length, IsObject } from "class-validator";

export class ProblemSubmissionContentTraditional {
  @IsString()
  @Length(1, 20)
  language: string;

  @IsString()
  @Length(0, 1024 * 1024)
  code: string;

  @IsObject()
  languageOptions: object;
}
