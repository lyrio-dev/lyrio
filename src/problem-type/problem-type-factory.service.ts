import { Injectable } from "@nestjs/common";

import { ProblemType } from "@/problem/problem.entity";
import { SubmissionContent } from "@/submission/submission-content.interface";
import { SubmissionTestcaseResult } from "@/submission/submission-result.interface";
import { ProblemJudgeInfo } from "@/problem/problem-judge-info.interface";

import { ProblemTypeServiceInterface } from "./problem-type-service.interface";

import { ProblemTypeTraditionalService } from "./types/traditional/problem-type.service";
import { ProblemTypeInteractionService } from "./types/interaction/problem-type.service";
import { ProblemTypeSubmitAnswerService } from "./types/submit-answer/problem-type.service";

@Injectable()
export class ProblemTypeFactoryService {
  private readonly typeServices: Record<
    ProblemType,
    ProblemTypeServiceInterface<ProblemJudgeInfo, SubmissionContent, SubmissionTestcaseResult>
  >;

  constructor(
    private readonly problemTypeTraditionalService: ProblemTypeTraditionalService,
    private readonly problemTypeInteractionService: ProblemTypeInteractionService,
    private readonly problemTypeSubmitAnswerService: ProblemTypeSubmitAnswerService
  ) {
    this.typeServices = {
      [ProblemType.TRADITIONAL]: this.problemTypeTraditionalService,
      [ProblemType.INTERACTION]: this.problemTypeInteractionService,
      [ProblemType.SUBMIT_ANSWER]: this.problemTypeSubmitAnswerService
    };
  }

  type(
    problemType: ProblemType
  ): ProblemTypeServiceInterface<ProblemJudgeInfo, SubmissionContent, SubmissionTestcaseResult> {
    return this.typeServices[problemType];
  }
}
