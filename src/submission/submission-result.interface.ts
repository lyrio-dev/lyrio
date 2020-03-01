export interface SubmissionTestcaseResult {}

export interface SubmissionResult<TestcaseResult extends SubmissionTestcaseResult = SubmissionTestcaseResult> {
  compile?: {
    success: boolean;
    message: string;
  };
  // For SystemError and ConfigurationError
  systemMessage?: string;
  // testcaseHash = hash(IF, OF, TL, ML) for traditional
  //                hash(ID, OD, TL, ML) for samples
  // ->
  // result
  testcaseResult?: Record<string, TestcaseResult>;
  samples?: string[]; // The hash of testcase (if null, it's "Skipped")
  subtasks?: {
    score: number;
    fullScore: number;
    testcases: string[]; // The hash of testcase (if null, it's "Skipped")
  }[];
}
