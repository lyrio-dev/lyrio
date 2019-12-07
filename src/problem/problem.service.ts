import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { LocalizedContentService } from "@/localized-content/localized-content.service";
import { ProblemEntity, ProblemType } from "./problem.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemSampleEntity } from "./problem-sample.entity";
import { ProblemJudgeInfoService } from "./problem-judge-info.service";
import { ProblemStatementDto, UpdateProblemStatementRequestDto } from "./dto";
import { LocalizedContentType } from "@/localized-content/localized-content.entity";
import { Locale } from "@/common/locale.type";
import { ProblemContentSection } from "./problem-content.interface";
import { ProblemSampleData } from "./problem-sample-data.interface";
import { ProblemJudgeInfo } from "./judge-info/problem-judge-info.interface";

@Injectable()
export class ProblemService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ProblemEntity)
    private readonly problemRepository: Repository<ProblemEntity>,
    @InjectRepository(ProblemJudgeInfoEntity)
    private readonly problemJudgeInfoRepository: Repository<
      ProblemJudgeInfoEntity
    >,
    @InjectRepository(ProblemSampleEntity)
    private readonly problemSampleRepository: Repository<ProblemSampleEntity>,
    private readonly problemJudgeInfoService: ProblemJudgeInfoService,
    private readonly localizedContentService: LocalizedContentService
  ) {}

  async findProblemById(id: number): Promise<ProblemEntity> {
    return this.problemRepository.findOne(id);
  }

  async findProblemByDisplayId(displayId: number): Promise<ProblemEntity> {
    return this.problemRepository.findOne({
      displayId: displayId
    });
  }

  async createProblem(
    owner: UserEntity,
    type: ProblemType,
    statement: ProblemStatementDto
  ): Promise<ProblemEntity> {
    let problem: ProblemEntity;
    await this.connection.transaction(
      "SERIALIZABLE",
      async transactionalEntityManager => {
        problem = new ProblemEntity();
        problem.displayId = null;
        problem.type = type;
        problem.isPublic = false;
        problem.ownerId = owner.id;
        problem.locales = statement.localizedContents
          .map(localizedContent => localizedContent.locale)
          .sort();
        await transactionalEntityManager.save(problem);

        const problemJudgeInfo = new ProblemJudgeInfoEntity();
        problemJudgeInfo.problemId = problem.id;
        problemJudgeInfo.judgeInfo = this.problemJudgeInfoService.getDefaultJudgeInfoOfType(
          type
        );
        await transactionalEntityManager.save(problemJudgeInfo);

        const problemSample = new ProblemSampleEntity();
        problemSample.problemId = problem.id;
        problemSample.data = statement.samples;
        await transactionalEntityManager.save(problemSample);

        for (const localizedContent of statement.localizedContents) {
          await this.localizedContentService.createOrUpdate(
            problem.id,
            LocalizedContentType.PROBLEM_TITLE,
            localizedContent.locale,
            localizedContent.title,
            transactionalEntityManager
          );
          await this.localizedContentService.createOrUpdate(
            problem.id,
            LocalizedContentType.PROBLEM_CONTENT,
            localizedContent.locale,
            JSON.stringify(localizedContent.contentSections),
            transactionalEntityManager
          );
        }
      }
    );

    return problem;
  }

  async updateProblemStatement(
    problem: ProblemEntity,
    request: UpdateProblemStatementRequestDto
  ): Promise<boolean> {
    // If the user wants to delete all locale versions of the problem statement...
    if (
      problem.locales.length === request.updatingLocalizedContents.length &&
      request.updatingLocalizedContents.every(
        updatingLocalizedContent => updatingLocalizedContent.delete
      )
    ) {
      return false;
    }

    await this.connection.transaction(async transactionalEntityManager => {
      if (request.samples != null) {
        const problemSample = await this.problemSampleRepository.findOne({
          problemId: problem.id
        });
        problemSample.data = request.samples;
        await transactionalEntityManager.save(problemSample);
      }

      for (const updatingLocalizedContent of request.updatingLocalizedContents) {
        if (updatingLocalizedContent.delete) {
          // Delete
          problem.locales = problem.locales.filter(
            locale => locale != updatingLocalizedContent.locale
          );
          await this.localizedContentService.delete(
            problem.id,
            LocalizedContentType.PROBLEM_TITLE,
            updatingLocalizedContent.locale,
            transactionalEntityManager
          );
          await this.localizedContentService.delete(
            problem.id,
            LocalizedContentType.PROBLEM_CONTENT,
            updatingLocalizedContent.locale,
            transactionalEntityManager
          );
        } else {
          // Update
          if (!problem.locales.includes(updatingLocalizedContent.locale))
            problem.locales.push(updatingLocalizedContent.locale);
          await this.localizedContentService.createOrUpdate(
            problem.id,
            LocalizedContentType.PROBLEM_TITLE,
            updatingLocalizedContent.locale,
            updatingLocalizedContent.title
          );
          await this.localizedContentService.createOrUpdate(
            problem.id,
            LocalizedContentType.PROBLEM_CONTENT,
            updatingLocalizedContent.locale,
            JSON.stringify(updatingLocalizedContent.contentSections)
          );
        }
      }

      problem.locales = problem.locales.sort();
      await transactionalEntityManager.save(problem);
    });

    return true;
  }

  // Get a problem's title of a locale. If no title for this locale returns any one.
  // TODO: Fallback to English/Chinese first?
  async getProblemLocalizedTitle(
    problem: ProblemEntity,
    locale: Locale
  ): Promise<[Locale, string]> {
    const title = await this.localizedContentService.get(
      problem.id,
      LocalizedContentType.PROBLEM_TITLE,
      locale
    );
    if (title != null) return [locale, title];
    return await this.localizedContentService.getOfAnyLocale(
      problem.id,
      LocalizedContentType.PROBLEM_TITLE
    );
  }

  // Get a problem's content of a locale. If no content for this locale returns any one.
  // TODO: Fallback to English/Chinese first?
  async getProblemLocalizedContent(
    problem: ProblemEntity,
    locale: Locale
  ): Promise<[Locale, ProblemContentSection[]]> {
    const data = await this.localizedContentService.get(
      problem.id,
      LocalizedContentType.PROBLEM_CONTENT,
      locale
    );
    if (data != null) return [locale, JSON.parse(data)];

    const [
      fallbackLocale,
      fallbackData
    ] = await this.localizedContentService.getOfAnyLocale(
      problem.id,
      LocalizedContentType.PROBLEM_CONTENT
    );
    if (fallbackData != null) return [fallbackLocale, JSON.parse(fallbackData)];
  }

  async getProblemSamples(problem: ProblemEntity): Promise<ProblemSampleData> {
    const problemSample = await problem.sample;
    return problemSample.data;
  }

  async getProblemJudgeInfo(problem: ProblemEntity): Promise<ProblemJudgeInfo> {
    const problemJudgeInfo = await problem.judgeInfo;
    return problemJudgeInfo.judgeInfo;
  }
}
