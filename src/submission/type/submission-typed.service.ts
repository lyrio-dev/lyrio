import { Injectable } from "@nestjs/common";
import { ValidationError } from "class-validator";

import { ProblemType } from "@/problem/problem.entity";
import { SubmissionTypedServiceInterface } from "./submission-typed-service.interface";
import { SubmissionContent } from "../submission-content.interface";
import { SubmissionTypeTraditionalService } from "./traditional/submission-type-traditional.service";
import { SubmissionTestcaseResult } from "../submission-result.interface";

@Injectable()
export class SubmissionTypedService {
  private readonly typedServices: Record<
    ProblemType,
    SubmissionTypedServiceInterface<SubmissionContent, SubmissionTestcaseResult>
  >;

  constructor(private readonly submissionTypeTraditionalService: SubmissionTypeTraditionalService) {
    this.typedServices = {
      [ProblemType.TRADITIONAL]: this.submissionTypeTraditionalService
    };
  }

  public async validateSubmissionContent(
    problemType: ProblemType,
    submissionContent: SubmissionContent
  ): Promise<ValidationError[]> {
    return this.typedServices[problemType].validateSubmissionContent(submissionContent);
  }

  public async getCodeLanguageAndAnswerSizeFromSubmissionContent(
    problemType: ProblemType,
    submissionContent: SubmissionContent
  ) {
    return await this.typedServices[problemType].getCodeLanguageAndAnswerSizeFromSubmissionContent(submissionContent);
  }
}
