import validFilename = require("valid-filename");
import toposort = require("toposort");

import { ProblemFileEntity } from "@/problem/problem-file.entity";

interface JudgeInfoWithMetaAndSubtasks {
  timeLimit?: number;
  memoryLimit?: number;

  fileIo?: {
    inputFilename: string;
    outputFilename: string;
  };

  runSamples?: boolean;

  subtasks?: {
    timeLimit?: number;
    memoryLimit?: number;
    scoringType: "Sum" | "GroupMin" | "GroupMul";
    points?: number;
    dependencies?: number[];

    testcases: {
      inputFile?: string;
      outputFile?: string;

      timeLimit?: number;
      memoryLimit?: number;
      points?: number;
    }[];
  }[];
}

interface ValidateMetaAndSubtasksOptions {
  enableTimeMemoryLimit: boolean;
  hardTimeLimit?: number;
  hardMemoryLimit?: number;

  enableFileIo: boolean;
  enableInputFile: boolean;
  enableOutputFile: boolean;
}

export function validateMetaAndSubtasks(
  judgeInfo: JudgeInfoWithMetaAndSubtasks,
  testData: ProblemFileEntity[],
  options: ValidateMetaAndSubtasksOptions
) {
  const validateTimeLimit = (
    timeLimit: number,
    scope: "TASK" | "SUBTASK" | "TESTCASE",
    subtaskId?: number,
    testcaseId?: number
  ) => {
    if (scope !== "TASK" && timeLimit == null) return;
    if (!Number.isSafeInteger(timeLimit) || timeLimit <= 0)
      throw [`INVALID_TIME_LIMIT_${scope}`, subtaskId + 1, testcaseId + 1];
    if (options.hardTimeLimit != null && timeLimit > options.hardTimeLimit)
      throw [`TIME_LIMIT_TOO_LARGE_${scope}`, subtaskId + 1, testcaseId + 1, timeLimit];
  };

  const validateMemoryLimit = (
    memoryLimit: number,
    scope: "TASK" | "SUBTASK" | "TESTCASE",
    subtaskId?: number,
    testcaseId?: number
  ) => {
    if (scope !== "TASK" && memoryLimit == null) return;
    if (!Number.isSafeInteger(memoryLimit) || memoryLimit <= 0)
      throw [`INVALID_MEMORY_LIMIT_${scope}`, subtaskId + 1, testcaseId + 1];
    if (options.hardMemoryLimit != null && memoryLimit > options.hardMemoryLimit)
      throw [`MEMORY_LIMIT_TOO_LARGE_${scope}`, subtaskId + 1, testcaseId + 1, memoryLimit];
  };

  if (options.enableTimeMemoryLimit) {
    validateTimeLimit(judgeInfo.timeLimit, "TASK");
    validateMemoryLimit(judgeInfo.memoryLimit, "TASK");
  }

  if (options.enableFileIo && judgeInfo.fileIo) {
    if (typeof judgeInfo.fileIo.inputFilename !== "string" || !validFilename(judgeInfo.fileIo.inputFilename))
      throw ["INVALID_FILEIO_FILENAME", judgeInfo.fileIo.inputFilename];
    if (typeof judgeInfo.fileIo.outputFilename !== "string" || !validFilename(judgeInfo.fileIo.outputFilename))
      throw ["INVALID_FILEIO_FILENAME", judgeInfo.fileIo.outputFilename];
  }
  if (judgeInfo.subtasks && !judgeInfo.subtasks.length) throw ["NO_TESTCASES"];

  // [A, B] means B depends on A
  const edges: [number, number][] = [];
  (judgeInfo.subtasks || []).forEach(({ timeLimit, memoryLimit, scoringType, points, dependencies, testcases }, i) => {
    if (options.enableTimeMemoryLimit) {
      if (timeLimit != null) validateTimeLimit(timeLimit, "SUBTASK", i);
      if (memoryLimit != null) validateMemoryLimit(memoryLimit, "SUBTASK", i);
    }

    if (!["Sum", "GroupMin", "GroupMul"].includes(scoringType)) {
      throw ["INVALID_SCORING_TYPE", i + 1, scoringType];
    }

    if (points != null && (typeof points !== "number" || points < 0 || points > 100))
      throw ["INVALID_POINTS_SUBTASK", i + 1, points];

    if (Array.isArray(dependencies)) {
      dependencies.forEach(dependency => {
        if (!Number.isSafeInteger(dependency) || dependency < 0 || dependency >= judgeInfo.subtasks.length)
          throw ["INVALID_DEPENDENCY", i + 1, dependency];
        edges.push([dependency, i]);
      });
    }

    if (!Array.isArray(testcases) || testcases.length === 0) throw ["SUBTASK_HAS_NO_TESTCASES", i + 1];

    testcases.forEach(({ inputFile, outputFile, timeLimit, memoryLimit, points }, j) => {
      if (options.enableInputFile) {
        if (!testData.some(file => file.filename === inputFile)) throw ["NO_SUCH_INPUT_FILE", i + 1, j + 1, inputFile];
      }

      if (options.enableOutputFile) {
        if (!testData.some(file => file.filename === outputFile))
          throw ["NO_SUCH_OUTPUT_FILE", i + 1, j + 1, outputFile];
      }

      if (options.enableTimeMemoryLimit) {
        if (timeLimit != null) validateTimeLimit(timeLimit, "TESTCASE", i, j);
        if (memoryLimit != null) validateMemoryLimit(memoryLimit, "TESTCASE", i, j);
      }

      if (points != null && (typeof points !== "number" || points < 0 || points > 100))
        throw ["INVALID_POINTS_TESTCASE", i + 1, j + 1, points];
    });

    const sum = testcases.reduce((s, { points }) => (points ? s + points : s), 0);
    if (sum > 100) {
      throw ["POINTS_SUM_UP_TO_LARGER_THAN_100_TESTCASES", i + 1, sum];
    }
  });
  const sum = (judgeInfo.subtasks || []).reduce((s, { points }) => (points ? s + points : s), 0);
  if (sum > 100) {
    throw ["POINTS_SUM_UP_TO_LARGER_THAN_100_SUBTASKS", sum];
  }

  try {
    toposort.array(
      (judgeInfo.subtasks || []).map((subtask, i) => i),
      edges
    );
  } catch (e) {
    throw ["CYCLICAL_SUBTASK_DEPENDENCY"];
  }
}
