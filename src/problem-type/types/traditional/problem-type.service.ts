import { Injectable } from "@nestjs/common";

import { ValidationError, validate } from "class-validator";
import { plainToClass } from "class-transformer";

import { ConfigService } from "@/config/config.service";
import { ProblemFileEntity } from "@/problem/problem-file.entity";
import { SubmissionResult } from "@/submission/submission-result.interface";
import { CodeLanguageService } from "@/code-language/code-language.service";
import { validateMetaAndSubtasks } from "@/problem-type/common/meta-and-subtasks";
import { validateChecker } from "@/problem-type/common/checker";
import { validateExtraSourceFiles } from "@/problem-type/common/extra-source-files";
import { autoMatchInputToOutput } from "@/problem-type/common/auto-match-input-output";

import { SubmissionTestcaseResultTraditional } from "./submission-testcase-result.interface";
import { SubmissionContentTraditional } from "./submission-content.interface";
import { ProblemJudgeInfoTraditional } from "./problem-judge-info.interface";

import { ProblemTypeServiceInterface } from "../../problem-type-service.interface";

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

  shouldUploadAnswerFile(): boolean {
    return false;
  }

  enableStatistics(): boolean {
    return true;
  }

  preprocessJudgeInfo(
    judgeInfo: ProblemJudgeInfoTraditional,
    testData: ProblemFileEntity[]
  ): ProblemJudgeInfoTraditional {
    return Array.isArray(judgeInfo.subtasks)
      ? judgeInfo
      : {
          ...judgeInfo,
          subtasks: autoMatchInputToOutput(testData)
        };
  }

  validateJudgeInfo(
    judgeInfo: ProblemJudgeInfoTraditional,
    testData: ProblemFileEntity[],
    ignoreLimits: boolean
  ): void {
    validateMetaAndSubtasks(judgeInfo, testData, {
      enableTimeMemoryLimit: true,
      enableFileIo: true,
      enableInputFile: true,
      enableOutputFile: true,
      enableUserOutputFilename: false,
      hardTimeLimit: ignoreLimits ? null : this.configService.config.resourceLimit.problemTimeLimit,
      hardMemoryLimit: ignoreLimits ? null : this.configService.config.resourceLimit.problemMemoryLimit
    });

    validateChecker(judgeInfo, testData, {
      validateLanguageOptions: (language, languageOptions) =>
        this.codeLanguageService.validateLanguageOptions(language, languageOptions).length === 0,
      hardTimeLimit: ignoreLimits ? null : this.configService.config.resourceLimit.problemTimeLimit,
      hardMemoryLimit: ignoreLimits ? null : this.configService.config.resourceLimit.problemMemoryLimit
    });

    validateExtraSourceFiles(judgeInfo, testData);
  }

  async validateSubmissionContent(submissionContent: SubmissionContentTraditional): Promise<ValidationError[]> {
    const errors = await validate(plainToClass(SubmissionContentTraditional, submissionContent));
    if (errors.length > 0) return errors;
    return this.codeLanguageService.validateLanguageOptions(
      submissionContent.language,
      submissionContent.languageOptions
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async getCodeLanguageAndAnswerSizeFromSubmissionContentAndFile(submissionContent: SubmissionContentTraditional) {
    return {
      language: submissionContent.language,

      // string.length returns the number of charactars in the string
      // Convert to a buffer to get the number of bytes
      answerSize: Buffer.from(submissionContent.code).length
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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
