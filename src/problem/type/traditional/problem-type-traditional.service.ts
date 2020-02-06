import { Injectable } from "@nestjs/common";
import { ValidationError, validateSync } from "class-validator";
import { plainToClass } from "class-transformer";

import { ProblemTypeInterface } from "../problem-type.interface";
import { ProblemJudgeInfoTraditional } from "./problem-judge-info-traditional.interface";
import { ProblemSubmissionContentTraditional } from "./problem-submission-content-traditional.interface";

@Injectable()
export class ProblemTypeTraditionalService
  implements ProblemTypeInterface<ProblemJudgeInfoTraditional, ProblemSubmissionContentTraditional> {
  getDefaultJudgeInfo(): ProblemJudgeInfoTraditional {
    return {
      timeLimit: 1000,
      memoryLimit: 512,
      runSamples: true,
      subtasks: []
    };
  }

  validateSubmissionContent(submissionContent: ProblemSubmissionContentTraditional): ValidationError[] {
    return validateSync(plainToClass(ProblemSubmissionContentTraditional, submissionContent));
  }

  getCodeLanguageFromSubmissionContent(submissionContent: ProblemSubmissionContentTraditional): string {
    return submissionContent.language;
  }

  getAnswerSizeFromSubmissionContent(submissionContent: ProblemSubmissionContentTraditional): number {
    // string.length returns the number of charactars in the string
    // Convert to a buffer to get the number of bytes
    return Buffer.from(submissionContent.code).length;
  }
}
