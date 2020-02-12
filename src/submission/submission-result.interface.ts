export interface SubmissionTestcaseResult {}

export interface SubmissionResult<TestcaseResult extends SubmissionTestcaseResult = SubmissionTestcaseResult> {
  compile?: {
    success: boolean;
    message: string;
  };
  // For SystemError and ConfigurationError
  systemMessage?: string;
  // testcaseHash = hash(IF, OF, TL, ML) for traditional
  // ->
  // result
  testcaseResult?: Record<string, TestcaseResult>;
  subtasks?: {
    score: number;
    testcases: string[]; // The hash of testcase (if null, it's "Skipped")
  }[];
}
