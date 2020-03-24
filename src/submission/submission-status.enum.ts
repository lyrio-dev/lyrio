export enum SubmissionStatus {
  Pending = "Pending",

  ConfigurationError = "ConfigurationError",
  SystemError = "SystemError",
  Canceled = "Canceled",

  CompilationError = "CompilationError",

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
