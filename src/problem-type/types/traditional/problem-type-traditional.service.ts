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
import { CodeLanguageService } from "@/code-language/code-language.service";
import { CodeLanguage } from "@/code-language/code-language.type";

@Injectable()
export class ProblemTypeTraditionalService
  implements
    ProblemTypeServiceInterface<
      ProblemJudgeInfoTraditional,
      SubmissionContentTraditional,
      SubmissionTestcaseResultTraditional
    > {
  constructor(private configService: ConfigService, private codeLanguageService: CodeLanguageService) {}

  getDefaultJudgeInfo(): ProblemJudgeInfoTraditional {
    return {
      timeLimit: Math.min(1000, this.configService.config.resourceLimit.problemTimeLimit),
      memoryLimit: Math.min(512, this.configService.config.resourceLimit.problemTimeLimit),
      runSamples: true,
      subtasks: null,
      checker: {
        type: "lines",
        caseSensitive: false
      }
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
                  inputFile: input.filename,
                  outputFile: output.filename
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
      ({ timeLimit, memoryLimit, scoringType, points, dependencies, testcases }, i) => {
        if (timeLimit != null) validateTimeLimit(timeLimit, "SUBTASK", i);
        if (memoryLimit != null) validateMemoryLimit(memoryLimit, "SUBTASK", i);

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
          if (!testData.some(file => file.filename === inputFile))
            throw ["NO_SUCH_INPUT_FILE", i + 1, j + 1, inputFile];
          if (!testData.some(file => file.filename === outputFile))
            throw ["NO_SUCH_OUTPUT_FILE", i + 1, j + 1, outputFile];

          if (timeLimit != null) validateTimeLimit(timeLimit, "TESTCASE", i, j);
          if (memoryLimit != null) validateMemoryLimit(memoryLimit, "TESTCASE", i, j);
          if (points != null && (typeof points !== "number" || points < 0 || points > 100))
            throw ["INVALID_POINTS_TESTCASE", i + 1, j + 1, points];
        });

        const sum = testcases.reduce((s, { points }) => (points ? s + points : s), 0);
        if (sum > 100) {
          throw ["POINTS_SUM_UP_TO_LARGER_THAN_100_TESTCASES", i + 1, sum];
        }
      }
    );
    const sum = (judgeInfo.subtasks || []).reduce((s, { points }) => (points ? s + points : s), 0);
    if (sum > 100) {
      throw ["POINTS_SUM_UP_TO_LARGER_THAN_100_SUBTASKS", sum];
    }

    if (!judgeInfo.checker || !["integers", "floats", "lines", "binary", "custom"].includes(judgeInfo.checker.type)) {
      throw ["INVALID_CHECKER_TYPE"];
    }
    switch (judgeInfo.checker.type) {
      case "floats":
        if (!(Number.isSafeInteger(judgeInfo.checker.precision) && judgeInfo.checker.precision > 0))
          throw ["INVALID_CHECKER_OPTIONS"];
        break;
      case "lines":
        if (typeof judgeInfo.checker.caseSensitive !== "boolean") throw ["INVALID_CHECKER_OPTIONS"];
        break;
      case "custom":
        const checker = judgeInfo.checker;
        if (!["testlib", "legacy", "lemon", "hustoj", "qduoj", "domjudge"].includes(checker.interface))
          throw ["INVALID_CHECKER_INTERFACE"];
        if (!Object.values(CodeLanguage).includes(checker.language)) throw ["INVALID_CHECKER_LANGUAGE"];
        if (!testData.some(file => file.filename === checker.filename))
          throw ["NO_SUCH_CHECKER_FILE", checker.filename];
        const languageOptionsValidationErrors = this.codeLanguageService.validateLanguageOptions(
          checker.language,
          checker.languageOptions
        );
        if (languageOptionsValidationErrors.length > 0) throw ["INVALID_CHECKER_LANGUAGE_OPTIONS"];
        break;
    }

    if (judgeInfo.extraSourceFiles) {
      if (typeof judgeInfo.extraSourceFiles !== "object") throw ["INVALID_EXTRA_SOURCE_FILES"];

      Object.entries(judgeInfo.extraSourceFiles).forEach(([codeLanguage, files]) => {
        if (!Object.values(CodeLanguage).includes(codeLanguage as any)) throw ["INVALID_EXTRA_SOURCE_FILES_LANGUAGE"];
        if (typeof files !== "object") throw ["INVALID_EXTRA_SOURCE_FILES"];

        Object.entries(files).forEach(([dst, src], i) => {
          if (typeof dst !== "string" || !validFilename(dst))
            throw ["INVALID_EXTRA_SOURCE_FILES_DST", codeLanguage, i + 1, dst];
          if (!testData.some(file => file.filename === src))
            throw ["NO_SUCH_EXTRA_SOURCE_FILES_SRC", codeLanguage, i + 1, src];
        });
      });
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
    const errors = await validate(plainToClass(SubmissionContentTraditional, submissionContent));
    if (errors.length > 0) return errors;
    return this.codeLanguageService.validateLanguageOptions(
      submissionContent.language,
      submissionContent.languageOptions
    );
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
