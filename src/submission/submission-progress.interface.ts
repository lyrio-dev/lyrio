import { JudgeTaskProgress } from "@/judge/judge-task-progress.interface";

import { SubmissionStatus } from "./submission-status.enum";
import { SubmissionResultOmittableString } from "./submission-testcase-result-omittable-string.interface";

export enum SubmissionProgressType {
  Preparing = "Preparing",
  Compiling = "Compiling",
  Running = "Running",
  Finished = "Finished"
}

export interface SubmissionTestcaseResult {}

interface TestcaseProgressReference {
  // If !waiting && !running && !testcaseHash, it's "Skipped"
  waiting?: boolean;
  running?: boolean;
  testcaseHash?: string;
}

export interface SubmissionProgress<TestcaseResult extends SubmissionTestcaseResult = SubmissionTestcaseResult>
  extends JudgeTaskProgress {
  progressType: SubmissionProgressType;
  pretestsFinished?: boolean;

  // Only valid when pretests finished
  pretestsStatus?: SubmissionStatus;
  pretestsScore?: number;
  pretestsTimeUsed?: number;
  pretestsMemoryUsed?: number;

  // Only valid when finished
  status?: SubmissionStatus;
  score?: number;
  timeUsed?: number;
  memoryUsed?: number;
  totalOccupiedTime?: number;

  compile?: {
    compileTaskHash: string;
    success: boolean;
    message: SubmissionResultOmittableString;
  };

  systemMessage?: SubmissionResultOmittableString;

  // testcaseHash
  // ->
  // result
  testcaseResult?: Record<string, TestcaseResult>;
  samples?: TestcaseProgressReference[];
  subtasks?: {
    isPretest?: boolean;
    score: number;
    fullScore: number;
    testcases: TestcaseProgressReference[];
  }[];
}
