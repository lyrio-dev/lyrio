import { ProblemJudgeInfo } from "./problem-judge-info.interface";

export interface ProblemJudgeInfoTraditional extends ProblemJudgeInfo {
  /*
   * The default time / memory limit
   * One is ignored in a subtask if the it defined its own default
   */
  defaultTimeLimit: number;
  defaultMemoryLimit: number;

  /*
   * Be null if not using file IO
   */
  fileIo?: {
    inputFileName: string;
    outputFileName: string;
  };

  testdata?: {
    /*
     * Testcases are pre-defined independent of the subtasks each with its
     * data file name and time / memory limit
     */
    testcases: {
      inputFileName: string;
      outputFileName: string;

      // If one of these is null,
      // the one's default of the subtask if exists, or of problem is used
      timeLimit?: number;
      memoryLimit?: number;
    };

    /*
     * There could be multiple subtasks in a problem
     * Each subtask contains some testcases
     */
    subtasks: {
      /*
       * The default time / memory limit
       * One is ignored in a testcase if the it defined its own default
       */
      defaultTimeLimit?: number;
      defaultMemoryLimit?: number;

      testcases: {
        // The ID is the testcase's index in the outside testcases array
        id: number;
        // The weight of this testcase in the subtask,
        // which should add up to 100 for all testcases of this subtask
        percentagePoints: number;
      }[];

      // Refer to https://cms.readthedocs.io/en/v1.4/Task%20types.html
      scoringType: "Sum" | "GroupMin" | "GroupMul";

      // The weight of this subtask in the problem,
      // which should add up to 100 for all subtasks of this problem
      percentagePoints: number;
    }[];
  };
}
