import { Injectable } from "@nestjs/common";

import { ValidationError } from "class-validator";

import { ConfigService } from "@/config/config.service";
import { ProblemFileEntity } from "@/problem/problem-file.entity";
import { SubmissionProgress } from "@/submission/submission-progress.interface";
import { CodeLanguageService } from "@/code-language/code-language.service";
import { validateMetaAndSubtasks } from "@/problem-type/common/meta-and-subtasks";
import { validateChecker } from "@/problem-type/common/checker";
import { autoMatchOutputToInput } from "@/problem-type/common/auto-match-input-output";
import { FileEntity } from "@/file/file.entity";
import { restrictProperties } from "@/problem-type/common/restrict-properties";

import { SubmissionTestcaseResultSubmitAnswer } from "./submission-testcase-result.interface";
import { SubmissionContentSubmitAnswer } from "./submission-content.interface";
import { ProblemJudgeInfoSubmitAnswer } from "./problem-judge-info.interface";

import { ProblemTypeServiceInterface } from "../../problem-type-service.interface";

@Injectable()
export class ProblemTypeSubmitAnswerService
  implements
    ProblemTypeServiceInterface<
      ProblemJudgeInfoSubmitAnswer,
      SubmissionContentSubmitAnswer,
      SubmissionTestcaseResultSubmitAnswer
    >
{
  constructor(private configService: ConfigService, private codeLanguageService: CodeLanguageService) {}

  getDefaultJudgeInfo(): ProblemJudgeInfoSubmitAnswer {
    return {
      subtasks: null,
      checker: {
        type: "lines",
        caseSensitive: false
      }
    };
  }

  shouldUploadAnswerFile(): boolean {
    return true;
  }

  enableStatistics(): boolean {
    return false;
  }

  preprocessJudgeInfo(
    judgeInfo: ProblemJudgeInfoSubmitAnswer,
    testData: ProblemFileEntity[]
  ): ProblemJudgeInfoSubmitAnswer {
    return Array.isArray(judgeInfo.subtasks)
      ? judgeInfo
      : {
          ...judgeInfo,
          subtasks: autoMatchOutputToInput(testData, true)
        };
  }

  validateAndFilterJudgeInfo(
    judgeInfo: ProblemJudgeInfoSubmitAnswer,
    testData: ProblemFileEntity[],
    ignoreLimits: boolean
  ): void {
    validateMetaAndSubtasks(judgeInfo, testData, {
      enableTimeMemoryLimit: false,
      enableFileIo: false,
      enableInputFile: "optional",
      enableOutputFile: true,
      enableUserOutputFilename: true
    });

    validateChecker(judgeInfo, testData, {
      validateCompileAndRunOptions: (language, compileAndRunOptions) =>
        this.codeLanguageService.validateCompileAndRunOptions(language, compileAndRunOptions).length === 0,
      hardTimeLimit: ignoreLimits ? null : this.configService.config.resourceLimit.problemTimeLimit,
      hardMemoryLimit: ignoreLimits ? null : this.configService.config.resourceLimit.problemMemoryLimit
    });

    restrictProperties(judgeInfo, ["subtasks", "checker"]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateSubmissionContent(submissionContent: SubmissionContentSubmitAnswer): Promise<ValidationError[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCodeLanguageAndAnswerSizeFromSubmissionContentAndFile(
    submissionContent: SubmissionContentSubmitAnswer,
    file: FileEntity
  ) {
    return {
      language: null,
      answerSize: file.size
    };
  }

  getTimeAndMemoryUsedFromFinishedSubmissionProgress(
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    submissionProgress: SubmissionProgress<SubmissionTestcaseResultSubmitAnswer>
  ) {
    return {
      timeUsed: null,
      memoryUsed: null
    };
  }
}
