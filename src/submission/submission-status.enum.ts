export enum SubmissionStatus {
  Pending = "Pending",

  ConfigurationError = "ConfigurationError",
  SystemError = "SystemError",
  Canceled = "Canceled",
  Skipped = "Skipped",

  CompilationError = "CompilationError",

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

/**
 * These statuses are invalid and will NOT be counted in contests.
 */
export const invalidSubmissionStatus = new Set([
  SubmissionStatus.Pending,
  SubmissionStatus.ConfigurationError,
  SubmissionStatus.SystemError,
  SubmissionStatus.Canceled,
  SubmissionStatus.Skipped,
  SubmissionStatus.CompilationError,
  SubmissionStatus.JudgementFailed
]);
