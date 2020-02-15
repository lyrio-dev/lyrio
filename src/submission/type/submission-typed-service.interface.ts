import { ValidationError } from "class-validator";
import { SubmissionResult } from "../submission-result.interface";

export interface SubmissionTypedServiceInterface<SubmissionContentType, SubmissionTestcaseProgressType> {
  validateSubmissionContent(submissionContent: SubmissionContentType): Promise<ValidationError[]>;
  getCodeLanguageAndAnswerSizeFromSubmissionContent(
    submissionContent: SubmissionContentType
  ): Promise<{ language: string; answerSize: number }>;
  getTimeAndMemoryUsedFromSubmissionResult(
    submissionResult: SubmissionResult
  ): Promise<{ timeUsed: number; memoryUsed: number }>;
}
