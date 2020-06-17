import { SubmissionTestcaseResult } from "@/submission/submission-result.interface";

// For subtasks and testcasese
export enum SubmissionTestcaseStatusInteraction {
  SystemError = "SystemError",

  FileError = "FileError",
  RuntimeError = "RuntimeError",
  TimeLimitExceeded = "TimeLimitExceeded",
  MemoryLimitExceeded = "MemoryLimitExceeded",
  OutputLimitExceeded = "OutputLimitExceeded",
  InvalidInteraction = "InvalidInteraction",

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
    outputFile: string;
  };
  status: SubmissionTestcaseStatusInteraction;
  score: number;
  time?: number;
  memory?: number;
  input?: string;
  output?: string;
  userOutput?: string;
  userError?: string;
  checkerMessage?: string;
  systemMessage?: string;
}
