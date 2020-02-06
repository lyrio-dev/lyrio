import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection } from "typeorm";
import { ValidationError } from "class-validator";

import { SubmissionEntity } from "./submission.entity";
import { SubmissionDetailEntity } from "./submission-detail.entity";
import { ProblemService } from "@/problem/problem.service";
import { ProblemTypeService } from "@/problem/type/problem-type.service";
import { UserEntity } from "@/user/user.entity";
import { ProblemEntity } from "@/problem/problem.entity";
import { ProblemSubmissionContent } from "@/problem/type/problem-submission-content.interface";
import { SubmissionStatus } from "./submission-status.enum";

@Injectable()
export class SubmissionService {
  constructor(
    @InjectConnection()
    private connection: Connection,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepository: Repository<SubmissionEntity>,
    @InjectRepository(SubmissionDetailEntity)
    private readonly submissionDetailRepository: Repository<SubmissionDetailEntity>,
    private readonly problemService: ProblemService,
    private readonly problemTypeService: ProblemTypeService
  ) {}

  async findSubmissionById(submissionId: number): Promise<SubmissionEntity> {
    return await this.submissionRepository.findOne({
      id: submissionId
    });
  }

  async createSubmission(
    submitter: UserEntity,
    problem: ProblemEntity,
    content: ProblemSubmissionContent
  ): Promise<[ValidationError[], SubmissionEntity]> {
    const validationError = this.problemTypeService.validateSubmissionContent(problem.type, content);
    if (validationError && validationError.length > 0) return [validationError, null];

    return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const submission = new SubmissionEntity();
      submission.isPublic = problem.isPublic;
      submission.codeLanguage = this.problemTypeService.getCodeLanguageFromSubmissionContent(problem.type, content);
      submission.answerSize = this.problemTypeService.getAnswerSizeFromSubmissionContent(problem.type, content);
      submission.score = null;
      submission.status = SubmissionStatus.Pending;
      submission.submitTime = new Date();
      submission.problemId = problem.id;
      submission.submitterId = submitter.id;
      await transactionalEntityManager.save(submission);

      const submissionDetail = new SubmissionDetailEntity();
      submissionDetail.submissionId = submission.id;
      submissionDetail.content = content;
      submissionDetail.result = null;
      await transactionalEntityManager.save(submissionDetail);

      await this.problemService.updateProblemStatistics(problem, 1, 0, transactionalEntityManager);

      return [null, submission];
    });

    // TODO: Add to judge queue
  }

  async getSubmissionDetail(submission: SubmissionEntity): Promise<SubmissionDetailEntity> {
    return this.submissionDetailRepository.findOne({
      submissionId: submission.id
    });
  }
}
