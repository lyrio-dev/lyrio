import { ProblemJudgeInfo } from "@/problem/problem-judge-info.interface";
import { CodeLanguage } from "@/code-language/code-language.type";

interface CheckerTypeIntegers {
  type: "integers";
}

interface CheckerTypeFloats {
  type: "floats";
  precision: number;
}

interface CheckerTypeLines {
  type: "lines";
  caseSensitive: boolean;
}

interface CheckerTypeBinary {
  type: "binary";
}

interface CheckerTypeCustom {
  type: "custom";
  interface: string;
  language: CodeLanguage;
  languageOptions: unknown;
  filename: string;
}

export interface ProblemJudgeInfoTraditional extends ProblemJudgeInfo {
  /*
   * The default time / memory limit
   * One is ignored in a subtask if the it defined its own default
   */
  timeLimit: number;
  memoryLimit: number;

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
      inputFilename: string;
      outputFilename: string;

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

  // integers: check the equivalent of each integer in user's output and answer
  // floats:   check each float in user's output and answer
  //           allow output with relative or absolute error not exceeding [floats.precision].
  // lines:    check the equivalent of text in each line (separated by "\n"), maybe case-insensitive
  //           any space characters (space, \t, \r) in the end of a line will be ignored
  //           any empty lines in the end of file will be ignored
  // binary:   check if the user's output and answer files are equal in binary
  // custom:   use a custom program to check the user's output
  checker: CheckerTypeIntegers | CheckerTypeFloats | CheckerTypeLines | CheckerTypeBinary | CheckerTypeCustom;

  // The map of files to be copied to the source code directory when compileing for each code language
  extraSourceFiles?: Partial<Record<CodeLanguage, Record<string, string>>>;
}
