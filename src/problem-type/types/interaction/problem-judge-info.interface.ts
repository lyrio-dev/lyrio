import { ProblemJudgeInfo } from "@/problem/problem-judge-info.interface";
import { CodeLanguage } from "@/code-language/code-language.type";

export interface ProblemJudgeInfoInteraction extends ProblemJudgeInfo {
  /*
   * The default time / memory limit
   * One is ignored in a subtask if the it defined its own default
   */
  timeLimit: number;
  memoryLimit: number;

  /*
   * If ture, samples in statement will be run before all subtasks
   * If a submission failed on samples, all subtasks will be skipped
   */
  runSamples?: boolean;

  /*
   * There could be multiple subtasks in a problem
   * Each subtask contains some testcases
   * null for detecting from testdata files automatically
   */
  subtasks: {
    /*
     * The default time / memory limit
     * One is ignored in a testcase if the it defined its own default
     */
    timeLimit?: number;
    memoryLimit?: number;

    testcases: {
      inputFile: string;

      // If one of these is null,
      // the one's default of the subtask if exists, or of problem is used
      timeLimit?: number;
      memoryLimit?: number;

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

  // The program to send command and data to user's program and outputs user's score
  interactor: {
    // stdio: The interactor and user's program's stdin and stdout are connected with two pipes
    //   shm: A shared memory region is created for interactor and user's program's communication
    interface: "stdio" | "shm";
    sharedMemorySize?: number;
    language: CodeLanguage;
    compileAndRunOptions: unknown;
    filename: string;
    timeLimit?: number;
    memoryLimit?: number;
  };

  // The map of files to be copied to the source code directory when compileing for each code language
  extraSourceFiles?: Partial<Record<CodeLanguage, Record<string, string>>>;
}
