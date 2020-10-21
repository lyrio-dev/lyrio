import { SubmissionTestcaseResult } from "@/submission/submission-progress.interface";
import { SubmissionResultOmittableString } from "@/submission/submission-testcase-result-omittable-string.interface";

// For subtasks and testcasese
export enum SubmissionTestcaseStatusInteraction {
  SystemError = "SystemError",

  RuntimeError = "RuntimeError",
  TimeLimitExceeded = "TimeLimitExceeded",
  MemoryLimitExceeded = "MemoryLimitExceeded",
  OutputLimitExceeded = "OutputLimitExceeded",

  PartiallyCorrect = "PartiallyCorrect",
  WrongAnswer = "WrongAnswer",
  Accepted = "Accepted",

  JudgementFailed = "JudgementFailed"
}

export interface SubmissionTestcaseResultInteraction extends SubmissionTestcaseResult {
  testcaseInfo: {
    timeLimit: number;
    memoryLimit: number;
    inputFile: string;
  };
  status: SubmissionTestcaseStatusInteraction;
  score: number;
  time?: number;
  memory?: number;
  input?: SubmissionResultOmittableString;
  userError?: SubmissionResultOmittableString;
  interactorMessage?: SubmissionResultOmittableString;
  systemMessage?: SubmissionResultOmittableString;
}
