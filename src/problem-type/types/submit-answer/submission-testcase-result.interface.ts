import { SubmissionTestcaseResult } from "@/submission/submission-progress.interface";

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
  input?: string;
  output?: string;
  userOutput?: string;
  userOutputLength?: number;
  checkerMessage?: string;
  systemMessage?: string;
}
