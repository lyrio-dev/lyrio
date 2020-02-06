import { Injectable } from "@nestjs/common";
import { ValidationError } from "class-validator";

import { ProblemType } from "../problem.entity";
import { ProblemTypeInterface } from "./problem-type.interface";

import { ProblemTypeTraditionalService } from "./traditional/problem-type-traditional.service";

import { ProblemJudgeInfo } from "./problem-judge-info.interface";
import { ProblemSubmissionContent } from "./problem-submission-content.interface";

@Injectable()
export class ProblemTypeService {
  private readonly problemTypeInterfaces: Record<
    ProblemType,
    ProblemTypeInterface<ProblemJudgeInfo, ProblemSubmissionContent>
  >;

  constructor(private readonly problemJudgeInfoTraditionalService: ProblemTypeTraditionalService) {
    this.problemTypeInterfaces = {
      [ProblemType.TRADITIONAL]: this.problemJudgeInfoTraditionalService
    };
  }

  getDefaultJudgeInfo<T extends object>(problemType: ProblemType): T {
    return this.problemTypeInterfaces[problemType].getDefaultJudgeInfo() as T;
  }

  validateSubmissionContent(problemType: ProblemType, submissionContent: object): ValidationError[] {
    return this.problemTypeInterfaces[problemType].validateSubmissionContent(submissionContent as any);
  }

  getCodeLanguageFromSubmissionContent(problemType: ProblemType, submissionContent: object): string {
    return this.problemTypeInterfaces[problemType].getCodeLanguageFromSubmissionContent(submissionContent as any);
  }

  getAnswerSizeFromSubmissionContent(problemType: ProblemType, submissionContent: object): number {
    return this.problemTypeInterfaces[problemType].getAnswerSizeFromSubmissionContent(submissionContent as any);
  }
}
