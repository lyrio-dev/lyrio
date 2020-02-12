import { ValidationError } from "class-validator";

export interface SubmissionTypedServiceInterface<SubmissionContentType, SubmissionTestcaseProgressType> {
  validateSubmissionContent(submissionContent: SubmissionContentType): Promise<ValidationError[]>;
  getCodeLanguageAndAnswerSizeFromSubmissionContent(
    submissionContent: SubmissionContentType
  ): Promise<{ language: string; answerSize: number }>;
}
