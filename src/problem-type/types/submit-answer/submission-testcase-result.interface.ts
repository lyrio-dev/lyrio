import { SubmissionTestcaseResult } from "@/submission/submission-progress.interface";
import { SubmissionResultOmittableString } from "@/submission/submission-testcase-result-omittable-string.interface";

// For subtasks and testcasese
export enum SubmissionTestcaseStatusSubmitAnswer {
  SystemError = "SystemError",

  FileError = "FileError",
  OutputLimitExceeded = "OutputLimitExceeded",

  PartiallyCorrect = "PartiallyCorrect",
  WrongAnswer = "WrongAnswer",
  Accepted = "Accepted",

  JudgementFailed = "JudgementFailed"
}

export interface SubmissionTestcaseResultSubmitAnswer extends SubmissionTestcaseResult {
  testcaseInfo: {
    inputFile: string;
    outputFile: string;
  };
  status: SubmissionTestcaseStatusSubmitAnswer;
  score: number;
  input?: SubmissionResultOmittableString;
  output?: SubmissionResultOmittableString;
  userOutput?: SubmissionResultOmittableString;
  userOutputLength?: number;
  checkerMessage?: SubmissionResultOmittableString;
  systemMessage?: SubmissionResultOmittableString;
}
