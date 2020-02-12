import { JudgeTaskProgress } from "@/judge/judge-task-progress.interface";
import { SubmissionTestcaseResult } from "./submission-result.interface";
import { SubmissionStatus } from "./submission-status.enum";

export enum SubmissionProgressType {
  Preparing,
  Compiling,
  Running,
  Finished
}

export interface SubmissionProgress<TestcaseResult extends SubmissionTestcaseResult = SubmissionTestcaseResult>
  extends JudgeTaskProgress {
  progressType: SubmissionProgressType;

  // Only valid when finished
  status?: SubmissionStatus;
  score?: number;

  compile?: {
    success: boolean;
    message: string;
  };

  systemMessage?: string;

  // testcaseHash = hash(IF, OF, TL, ML) for traditional
  // ->
  // result
  testcaseResult?: Record<string, TestcaseResult>;
  subtasks?: {
    score: number;
    testcases: {
      // If !waiting && !running && !testcaseHash, it's "Skipped"
      waiting?: boolean;
      running?: boolean;
      testcaseHash?: string;
    }[];
  }[];
}
