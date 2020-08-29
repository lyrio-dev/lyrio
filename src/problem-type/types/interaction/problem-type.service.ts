import { Injectable } from "@nestjs/common";
import { ValidationError, validate } from "class-validator";
import { plainToClass } from "class-transformer";

import { ProblemJudgeInfoInteraction } from "./judge-info.interface";
import { ProblemTypeServiceInterface } from "../../problem-type-service.interface";
import { ConfigService } from "@/config/config.service";
import { ProblemFileEntity } from "@/problem/problem-file.entity";
import { SubmissionContentInteraction } from "./submission-content.interface";
import { SubmissionTestcaseResultInteraction } from "./submission-testcase-result.interface";
import { SubmissionResult } from "@/submission/submission-result.interface";
import { CodeLanguageService } from "@/code-language/code-language.service";
import { validateMetaAndSubtasks } from "@/problem-type/common/meta-and-subtasks";
import { validateExtraSourceFiles } from "@/problem-type/common/extra-source-files";
import { CodeLanguage } from "@/code-language/code-language.type";

@Injectable()
export class ProblemTypeInteractionService
  implements
    ProblemTypeServiceInterface<
      ProblemJudgeInfoInteraction,
      SubmissionContentInteraction,
      SubmissionTestcaseResultInteraction
    > {
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

  preprocessJudgeInfo(
    judgeInfo: ProblemJudgeInfoInteraction,
    testData: ProblemFileEntity[]
  ): ProblemJudgeInfoInteraction {
    return Array.isArray(judgeInfo.subtasks)
      ? judgeInfo
      : {
          ...judgeInfo,
          subtasks: [
            {
              scoringType: "Sum",
              testcases: testData
                .map(file => file.filename)
                .filter(filename => filename.toLowerCase().endsWith(".in"))
                .map(filename => ({ inputFile: filename }))
            }
          ]
        };
  }

  validateJudgeInfo(
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
      enableOutputFile: true,
      hardTimeLimit: hardTimeLimit,
      hardMemoryLimit: hardMemoryLimit
    });

    const interactor = judgeInfo.interactor;
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
    if (this.codeLanguageService.validateLanguageOptions(interactor.language, interactor.languageOptions).length > 0)
      throw ["INVALID_INTERACTOR_LANGUAGE_OPTIONS"];
    if (!Object.values(CodeLanguage).includes(interactor.language)) throw ["INVALID_INTERACTOR_LANGUAGE"];
    if (!testData.some(file => file.filename === interactor.filename))
      throw ["NO_SUCH_INTERACTOR_FILE", interactor.filename];

    const timeLimit = judgeInfo.interactor.timeLimit == null ? judgeInfo["timeLimit"] : judgeInfo.interactor.timeLimit;
    if (!Number.isSafeInteger(timeLimit) || timeLimit <= 0) throw [`INVALID_TIME_LIMIT_INTERACTOR`];
    if (hardTimeLimit != null && timeLimit > hardTimeLimit) throw [`TIME_LIMIT_TOO_LARGE_INTERACTOR`, timeLimit];

    const memoryLimit =
      judgeInfo.interactor.memoryLimit == null ? judgeInfo["memoryLimit"] : judgeInfo.interactor.memoryLimit;
    if (!Number.isSafeInteger(memoryLimit) || memoryLimit <= 0) throw [`INVALID_MEMORY_LIMIT_INTERACTOR`];
    if (hardMemoryLimit != null && memoryLimit > hardMemoryLimit)
      throw [`MEMORY_LIMIT_TOO_LARGE_INTERACTOR`, memoryLimit];

    validateExtraSourceFiles(judgeInfo, testData);
  }

  async validateSubmissionContent(submissionContent: SubmissionContentInteraction): Promise<ValidationError[]> {
    const errors = await validate(plainToClass(SubmissionContentInteraction, submissionContent));
    if (errors.length > 0) return errors;
    return this.codeLanguageService.validateLanguageOptions(
      submissionContent.language,
      submissionContent.languageOptions
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async getCodeLanguageAndAnswerSizeFromSubmissionContent(submissionContent: SubmissionContentInteraction) {
    return {
      language: submissionContent.language,

      // string.length returns the number of charactars in the string
      // Convert to a buffer to get the number of bytes
      answerSize: Buffer.from(submissionContent.code).length
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  getTimeAndMemoryUsedFromSubmissionResult(submissionResult: SubmissionResult<SubmissionTestcaseResultInteraction>) {
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
