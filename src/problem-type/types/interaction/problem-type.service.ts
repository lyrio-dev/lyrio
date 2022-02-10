import { Injectable } from "@nestjs/common";

import { ValidationError, validate } from "class-validator";
import { plainToClass } from "class-transformer";

import { ConfigService } from "@/config/config.service";
import { ProblemFileEntity } from "@/problem/problem-file.entity";
import { SubmissionProgress } from "@/submission/submission-progress.interface";
import { CodeLanguageService } from "@/code-language/code-language.service";
import { validateMetaAndSubtasks } from "@/problem-type/common/meta-and-subtasks";
import { validateExtraSourceFiles } from "@/problem-type/common/extra-source-files";
import { CodeLanguage } from "@/code-language/code-language.type";
import { autoMatchInputToOutput } from "@/problem-type/common/auto-match-input-output";
import { restrictProperties } from "@/problem-type/common/restrict-properties";

import { SubmissionTestcaseResultInteraction } from "./submission-testcase-result.interface";
import { SubmissionContentInteraction } from "./submission-content.interface";
import { ProblemJudgeInfoInteraction } from "./problem-judge-info.interface";

import { ProblemTypeServiceInterface } from "../../problem-type-service.interface";

@Injectable()
export class ProblemTypeInteractionService
  implements
    ProblemTypeServiceInterface<
      ProblemJudgeInfoInteraction,
      SubmissionContentInteraction,
      SubmissionTestcaseResultInteraction
    >
{
  constructor(private configService: ConfigService, private codeLanguageService: CodeLanguageService) {}

  getDefaultJudgeInfo(): ProblemJudgeInfoInteraction {
    return {
      timeLimit: Math.min(1000, this.configService.config.resourceLimit.problemTimeLimit),
      memoryLimit: Math.min(512, this.configService.config.resourceLimit.problemTimeLimit),
      runSamples: true,
      subtasks: null,
      interactor: null
    };
  }

  shouldUploadAnswerFile(): boolean {
    return false;
  }

  enableStatistics(): boolean {
    return true;
  }

  preprocessJudgeInfo(
    judgeInfo: ProblemJudgeInfoInteraction,
    testData: ProblemFileEntity[]
  ): ProblemJudgeInfoInteraction {
    return Array.isArray(judgeInfo.subtasks)
      ? judgeInfo
      : {
          ...judgeInfo,
          subtasks: autoMatchInputToOutput(testData, true)
        };
  }

  /* eslint-disable no-throw-literal */
  validateAndFilterJudgeInfo(
    judgeInfo: ProblemJudgeInfoInteraction,
    testData: ProblemFileEntity[],
    ignoreLimits: boolean
  ): void {
    const hardTimeLimit = ignoreLimits ? null : this.configService.config.resourceLimit.problemTimeLimit;
    const hardMemoryLimit = ignoreLimits ? null : this.configService.config.resourceLimit.problemMemoryLimit;

    validateMetaAndSubtasks(judgeInfo, testData, {
      enableTimeMemoryLimit: true,
      enableFileIo: true,
      enableInputFile: true,
      enableOutputFile: false,
      enableUserOutputFilename: false,
      hardTimeLimit,
      hardMemoryLimit,
      testcaseLimit: ignoreLimits ? null : this.configService.config.resourceLimit.problemTestcases
    });

    const { interactor } = judgeInfo;
    if (!interactor) throw ["INVALID_INTERACTOR"];
    if (!["stdio", "shm"].includes(interactor.interface)) throw ["INVALID_INTERACTOR_INTERFACE"];
    if (interactor.interface === "shm") {
      if (
        !Number.isSafeInteger(interactor.sharedMemorySize) ||
        interactor.sharedMemorySize < 4 ||
        interactor.sharedMemorySize > 128
      )
        throw ["INVALID_INTERACTOR_SHARED_MEMORY_SIZE"];
    }
    if (
      this.codeLanguageService.validateCompileAndRunOptions(interactor.language, interactor.compileAndRunOptions)
        .length > 0
    )
      throw ["INVALID_INTERACTOR_COMPILE_AND_RUN_OPTIONS"];
    if (!Object.values(CodeLanguage).includes(interactor.language)) throw ["INVALID_INTERACTOR_LANGUAGE"];
    if (!testData.some(file => file.filename === interactor.filename))
      throw ["NO_SUCH_INTERACTOR_FILE", interactor.filename];

    const timeLimit = judgeInfo.interactor.timeLimit == null ? judgeInfo.timeLimit : judgeInfo.interactor.timeLimit;
    if (!Number.isSafeInteger(timeLimit) || timeLimit <= 0) throw [`INVALID_TIME_LIMIT_INTERACTOR`];
    if (hardTimeLimit != null && timeLimit > hardTimeLimit) throw [`TIME_LIMIT_TOO_LARGE_INTERACTOR`, timeLimit];

    const memoryLimit =
      judgeInfo.interactor.memoryLimit == null ? judgeInfo.memoryLimit : judgeInfo.interactor.memoryLimit;
    if (!Number.isSafeInteger(memoryLimit) || memoryLimit <= 0) throw [`INVALID_MEMORY_LIMIT_INTERACTOR`];
    if (hardMemoryLimit != null && memoryLimit > hardMemoryLimit)
      throw [`MEMORY_LIMIT_TOO_LARGE_INTERACTOR`, memoryLimit];

    restrictProperties(judgeInfo.interactor, [
      "interface",
      "sharedMemorySize",
      "language",
      "compileAndRunOptions",
      "filename",
      "timeLimit",
      "memoryLimit"
    ]);

    validateExtraSourceFiles(judgeInfo, testData);

    restrictProperties(judgeInfo, [
      "timeLimit",
      "memoryLimit",
      "runSamples",
      "subtasks",
      "interactor",
      "extraSourceFiles"
    ]);
  }
  /* eslint-enable no-throw-literal */

  async validateSubmissionContent(submissionContent: SubmissionContentInteraction): Promise<ValidationError[]> {
    const errors = await validate(plainToClass(SubmissionContentInteraction, submissionContent), {
      whitelist: true,
      forbidNonWhitelisted: true
    });
    if (errors.length > 0) return errors;
    return this.codeLanguageService.validateCompileAndRunOptions(
      submissionContent.language,
      submissionContent.compileAndRunOptions
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async getCodeLanguageAndAnswerSizeFromSubmissionContentAndFile(submissionContent: SubmissionContentInteraction) {
    return {
      language: submissionContent.language,

      // string.length returns the number of charactars in the string
      // Convert to a buffer to get the number of bytes
      answerSize: Buffer.from(submissionContent.code).length
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  getTimeAndMemoryUsedFromFinishedSubmissionProgress(
    submissionProgress: SubmissionProgress<SubmissionTestcaseResultInteraction>
  ) {
    const result = {
      timeUsed: 0,
      memoryUsed: 0
    };

    if (submissionProgress) {
      if (Array.isArray(submissionProgress.subtasks)) {
        for (const subtask of submissionProgress.subtasks) {
          for (const testcase of subtask.testcases) {
            if (!testcase?.testcaseHash) continue;
            result.timeUsed += submissionProgress.testcaseResult[testcase.testcaseHash].time;
            result.memoryUsed = Math.max(
              result.memoryUsed,
              submissionProgress.testcaseResult[testcase.testcaseHash].memory
            );
          }
        }
      }
    }

    return result;
  }
}
