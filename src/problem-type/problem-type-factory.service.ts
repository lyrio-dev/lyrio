import { Injectable } from "@nestjs/common";

import { ProblemType } from "@/problem/problem.entity";
import { ProblemTypeServiceInterface } from "./problem-type-service.interface";

import { ProblemTypeTraditionalService } from "./types/traditional/problem-type-traditional.service";

import { ProblemJudgeInfo } from "../problem/problem-judge-info.interface";
import { SubmissionContent } from "@/submission/submission-content.interface";
import { SubmissionTestcaseResult } from "@/submission/submission-result.interface";

@Injectable()
export class ProblemTypeFactoryService {
  private readonly typeServices: Record<
    ProblemType,
    ProblemTypeServiceInterface<ProblemJudgeInfo, SubmissionContent, SubmissionTestcaseResult>
  >;

  constructor(private readonly problemTypeTraditionalService: ProblemTypeTraditionalService) {
    this.typeServices = {
      [ProblemType.TRADITIONAL]: this.problemTypeTraditionalService
    };
  }

  type(problemType: ProblemType) {
    return this.typeServices[problemType];
  }
}
