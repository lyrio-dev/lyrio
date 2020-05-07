import { Injectable } from "@nestjs/common";
import { ValidationError, validate } from "class-validator";
import { plainToClass } from "class-transformer";
import toposort = require("toposort");
import validFilename = require("valid-filename");

import { ProblemJudgeInfoTraditional } from "./problem-judge-info-traditional.interface";
import { ProblemTypeServiceInterface } from "../../problem-type-service.interface";
import { ConfigService } from "@/config/config.service";
import { ProblemFileEntity } from "@/problem/problem-file.entity";
import { SubmissionContentTraditional } from "./submission-content-traditional.interface";
import { SubmissionTestcaseResultTraditional } from "./submission-testcase-result-traditional.interface";
import { SubmissionResult } from "@/submission/submission-result.interface";

@Injectable()
export class ProblemTypeTraditionalService
  implements
    ProblemTypeServiceInterface<
      ProblemJudgeInfoTraditional,
      SubmissionContentTraditional,
      SubmissionTestcaseResultTraditional
    > {
  constructor(private configService: ConfigService) {}

  getDefaultJudgeInfo(): ProblemJudgeInfoTraditional {
    return {
      timeLimit: Math.min(1000, this.configService.config.resourceLimit.problemTimeLimit),
      memoryLimit: Math.min(512, this.configService.config.resourceLimit.problemTimeLimit),
      runSamples: true,
      subtasks: null
    };
  }

  preprocessJudgeInfo(
    judgeInfo: ProblemJudgeInfoTraditional,
    testData: ProblemFileEntity[]
  ): ProblemJudgeInfoTraditional {
    return Array.isArray(judgeInfo.subtasks)
      ? judgeInfo
      : {
          ...judgeInfo,
          subtasks: [
            {
              scoringType: "Sum",
              testcases: testData
                .filter(file => file.filename.toLowerCase().endsWith(".in"))
                .map<[ProblemFileEntity, ProblemFileEntity, number[]]>(input => [
                  input,
                  testData.find(file =>
                    [".out", ".ans"]
                      .map(ext => input.filename.slice(0, -3).toLowerCase() + ext)
                      .includes(file.filename.toLowerCase())
                  ),
                  (input.filename.match(/\d+/g) || []).map(parseInt)
                ])
                .filter(([input, outputFile]) => outputFile)
                .sort(([inputA, outputA, numbersA], [inputB, outputB, numbersB]) => {
                  const firstNonEqualIndex = [...Array(Math.max(numbersA.length, numbersB.length)).keys()].findIndex(
                    i => numbersA[i] !== numbersB[i]
                  );
                  return firstNonEqualIndex === -1
                    ? inputA.filename < inputB.filename
                      ? -1
                      : 1
                    : numbersA[firstNonEqualIndex] - numbersB[firstNonEqualIndex];
                })
                .map(([input, output]) => ({
                  inputFilename: input.filename,
                  outputFilename: output.filename
                }))
            }
          ]
        };
  }

  validateJudgeInfo(
    judgeInfo: ProblemJudgeInfoTraditional,
    testData: ProblemFileEntity[],
    ignoreLimits: boolean
  ): void {
    const validateTimeLimit = (
      timeLimit: number,
      scope: "TASK" | "SUBTASK" | "TESTCASE",
      subtaskId?: number,
      testcaseId?: number
    ) => {
      if (scope !== "TASK" && timeLimit == null) return;
      if (!Number.isSafeInteger(timeLimit) || timeLimit <= 0)
        throw [`INVALID_TIME_LIMIT_${scope}`, subtaskId + 1, testcaseId + 1];
      if (!ignoreLimits && timeLimit > this.configService.config.resourceLimit.problemTimeLimit)
        throw [
          `TIME_LIMIT_TOO_LARGE_${scope}`,
          subtaskId + 1,
          testcaseId + 1,
          this.configService.config.resourceLimit.problemTimeLimit
        ];
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
      if (!ignoreLimits && memoryLimit > this.configService.config.resourceLimit.problemMemoryLimit)
        throw [
          `MEMORY_LIMIT_TOO_LARGE_${scope}`,
          subtaskId + 1,
          testcaseId + 1,
          this.configService.config.resourceLimit.problemMemoryLimit
        ];
    };

    validateTimeLimit(judgeInfo.timeLimit, "TASK");
    validateMemoryLimit(judgeInfo.memoryLimit, "TASK");

    if (judgeInfo.fileIo) {
      if (typeof judgeInfo.fileIo.inputFilename !== "string" || !validFilename(judgeInfo.fileIo.inputFilename))
        throw ["INVALID_FILEIO_FILENAME", judgeInfo.fileIo.inputFilename];
      if (typeof judgeInfo.fileIo.outputFilename !== "string" || !validFilename(judgeInfo.fileIo.outputFilename))
        throw ["INVALID_FILEIO_FILENAME", judgeInfo.fileIo.outputFilename];
    }
    if (judgeInfo.subtasks && !judgeInfo.subtasks.length) throw ["NO_TESTCASES"];

    // [A, B] means B depends on A
    const edges: [number, number][] = [];
    (judgeInfo.subtasks || []).forEach(
      ({ timeLimit, memoryLimit, scoringType, percentagePoints, dependencies, testcases }, i) => {
        if (timeLimit != null) validateTimeLimit(timeLimit, "SUBTASK", i);
        if (memoryLimit != null) validateMemoryLimit(memoryLimit, "SUBTASK", i);

        if (!["Sum", "GroupMin", "GroupMul"].includes(scoringType)) {
          throw ["INVALID_SCORING_TYPE", i + 1, scoringType];
        }

        if (
          percentagePoints != null &&
          (typeof percentagePoints !== "number" || percentagePoints < 0 || percentagePoints > 100)
        )
          throw ["INVALID_POINTS_SUBTASK", i + 1, percentagePoints];

        if (Array.isArray(dependencies)) {
          dependencies.forEach(dependency => {
            if (!Number.isSafeInteger(dependency) || dependency < 0 || dependency >= judgeInfo.subtasks.length)
              throw ["INVALID_DEPENDENCY", i + 1, dependency];
            edges.push([dependency, i]);
          });
        }

        if (!Array.isArray(testcases) || testcases.length === 0) throw ["SUBTASK_HAS_NO_TESTCASES", i + 1];

        testcases.forEach(({ inputFilename, outputFilename, timeLimit, memoryLimit, percentagePoints }, j) => {
          if (!testData.some(file => file.filename === inputFilename))
            throw ["NO_SUCH_INPUT_FILE", i + 1, j + 1, inputFilename];
          if (!testData.some(file => file.filename === outputFilename))
            throw ["NO_SUCH_OUTPUT_FILE", i + 1, j + 1, outputFilename];

          if (timeLimit != null) validateTimeLimit(timeLimit, "TESTCASE", i, j);
          if (memoryLimit != null) validateMemoryLimit(memoryLimit, "TESTCASE", i, j);
          if (
            percentagePoints != null &&
            (typeof percentagePoints !== "number" || percentagePoints < 0 || percentagePoints > 100)
          )
            throw ["INVALID_POINTS_TESTCASE", i + 1, j + 1, percentagePoints];
        });

        const sum = testcases.reduce((s, { percentagePoints }) => (percentagePoints ? s + percentagePoints : s), 0);
        if (sum > 100) {
          throw ["POINTS_SUM_UP_TO_LARGER_THAN_100_TESTCASES", i + 1, sum];
        }
      }
    );
    const sum = (judgeInfo.subtasks || []).reduce(
      (s, { percentagePoints }) => (percentagePoints ? s + percentagePoints : s),
      0
    );
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

  async validateSubmissionContent(submissionContent: SubmissionContentTraditional): Promise<ValidationError[]> {
    return validate(plainToClass(SubmissionContentTraditional, submissionContent));
  }

  async getCodeLanguageAndAnswerSizeFromSubmissionContent(submissionContent: SubmissionContentTraditional) {
    return {
      language: submissionContent.language,

      // string.length returns the number of charactars in the string
      // Convert to a buffer to get the number of bytes
      answerSize: Buffer.from(submissionContent.code).length
    };
  }

  getTimeAndMemoryUsedFromSubmissionResult(submissionResult: SubmissionResult<SubmissionTestcaseResultTraditional>) {
    const result = {
      timeUsed: 0,
      memoryUsed: 0
    };

    if (submissionResult) {
      if (Array.isArray(submissionResult.subtasks)) {
        for (const subtask of submissionResult.subtasks) {
          for (const testcaseUuid of subtask.testcases) {
            if (!testcaseUuid) continue;
            result.timeUsed += submissionResult.testcaseResult[testcaseUuid].time;
            result.memoryUsed = Math.max(result.memoryUsed, submissionResult.testcaseResult[testcaseUuid].memory);
          }
        }
      }
    }

    return result;
  }
}
