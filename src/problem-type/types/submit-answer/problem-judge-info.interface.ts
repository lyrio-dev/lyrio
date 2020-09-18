import { ProblemJudgeInfo } from "@/problem/problem-judge-info.interface";
import { Checker } from "@/problem-type/common/checker";

export interface ProblemJudgeInfoSubmitAnswer extends ProblemJudgeInfo {
  /*
   * There could be multiple subtasks in a problem
   * Each subtask contains some testcases
   * null for detecting from testdata files automatically
   */
  subtasks: {
    testcases: {
      // Input files are optional for judging
      inputFile?: string;
      outputFile: string;

      // By default, user's output filename is equal to output filename
      userOutputFilename?: string;

      // The weight of this testcase in the subtask,
      // which should add up to 100 for all testcases of this subtask
      // Auto if not set
      points?: number;
    }[];

    // Refer to https://cms.readthedocs.io/en/v1.4/Task%20types.html
    scoringType: "Sum" | "GroupMin" | "GroupMul";

    // The weight of this subtask in the problem,
    // which should add up to 100 for all subtasks of this problem
    // Auto if not set
    points?: number;

    // The IDs of subtasks this subtask depends
    // A subtask will be skipped if one of it dependencies fails
    dependencies?: number[];
  }[];

  checker: Checker;
}
