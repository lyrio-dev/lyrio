import { SubmissionTestcaseResult } from "@/submission/submission-progress.interface";
import { SubmissionResultOmittableString } from "@/submission/submission-testcase-result-omittable-string.interface";

// For subtasks and testcasese
export enum SubmissionTestcaseStatusTraditional {
  SystemError = "SystemError",

  FileError = "FileError",
  RuntimeError = "RuntimeError",
  TimeLimitExceeded = "TimeLimitExceeded",
  MemoryLimitExceeded = "MemoryLimitExceeded",
  OutputLimitExceeded = "OutputLimitExceeded",

  PartiallyCorrect = "PartiallyCorrect",
  WrongAnswer = "WrongAnswer",
  Accepted = "Accepted",

  JudgementFailed = "JudgementFailed"
}

export interface SubmissionTestcaseResultTraditional extends SubmissionTestcaseResult {
  testcaseInfo: {
    timeLimit: number;
    memoryLimit: number;
    inputFile: string;
    outputFile: string;
  };
  status: SubmissionTestcaseStatusTraditional;
  score: number;
  time?: number;
  memory?: number;
  input?: SubmissionResultOmittableString;
  output?: SubmissionResultOmittableString;
  userOutput?: SubmissionResultOmittableString;
  userError?: SubmissionResultOmittableString;
  checkerMessage?: SubmissionResultOmittableString;
  systemMessage?: SubmissionResultOmittableString;
}
