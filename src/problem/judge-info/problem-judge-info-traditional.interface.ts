import { ProblemJudgeInfo } from "./problem-judge-info.interface";

export interface ProblemJudgeInfoTraditional extends ProblemJudgeInfo {
  /*
   * The default time / memory limit
   * One is ignored in a subtask if the it defined its own default
   */
  timeLimit?: number;
  memoryLimit?: number;

  /*
   * Be null if not using file IO
   */
  fileIo?: {
    inputFilename: string;
    outputFilename: string;
  };

  /*
   * If ture, samples in statement will be run before all subtasks
   * If a submission failed on samples, all subtasks will be skipped
   */
  runSamples?: boolean;

  /*
   * There could be multiple subtasks in a problem
   * Each subtask contains some testcases
   */
  subtasks: {
    /*
     * The default time / memory limit
     * One is ignored in a testcase if the it defined its own default
     */
    timeLimit?: number;
    memoryLimit?: number;

    testcases: {
      inputFilename?: string;
      outputFilename?: string;

      // If one of these is null,
      // the one's default of the subtask if exists, or of problem is used
      timeLimit?: number;
      memoryLimit?: number;

      // The weight of this testcase in the subtask,
      // which should add up to 100 for all testcases of this subtask
      // Auto if not set
      percentagePoints?: number;
    }[];

    // Refer to https://cms.readthedocs.io/en/v1.4/Task%20types.html
    scoringType: "Sum" | "GroupMin" | "GroupMul";

    // The weight of this subtask in the problem,
    // which should add up to 100 for all subtasks of this problem
    // Auto if not set
    percentagePoints?: number;

    // The IDs of subtasks this subtask depends
    // A subtask will be skipped if one of it dependencies fails
    dependencies?: number[];
  }[];
}
