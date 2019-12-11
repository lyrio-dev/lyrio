import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { GroupEntity } from "@/group/group.entity";
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
import {
  UserPrivilegeService,
  UserPrivilegeType
} from "@/user/user-privilege.service";
import {
  PermissionService,
  PermissionObjectType,
  PermissionType
} from "@/permission/permission.service";

export enum ProblemPermissionType {
  CREATE = "CREATE",
  READ = "READ",
  WRITE = "WRITE",
  CONTROL = "CONTROL",
  FULL_CONTROL = "FULL_CONTROL"
}

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
    private readonly localizedContentService: LocalizedContentService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly permissionService: PermissionService
  ) {}

  async findProblemById(id: number): Promise<ProblemEntity> {
    return this.problemRepository.findOne(id);
  }

  async findProblemByDisplayId(displayId: number): Promise<ProblemEntity> {
    return this.problemRepository.findOne({
      displayId: displayId
    });
  }

  async userHasPermission(
    user: UserEntity,
    type: ProblemPermissionType,
    problem?: ProblemEntity
  ): Promise<boolean> {
    switch (type) {
      // Everyone can create a problem
      case ProblemPermissionType.CREATE:
        if (!user) return false;
        else return true;

      // Everyone can read a public problem
      // Owner, admins and those who has read permission can read a non-public problem
      case ProblemPermissionType.READ:
        if (problem.isPublic) return true;
        else if (!user) return false;
        else if (user.id === problem.ownerId) return true;
        else if (user.isAdmin) return true;
        else if (
          await this.userPrivilegeService.userHasPrivilege(
            user,
            UserPrivilegeType.MANAGE_PROBLEM
          )
        )
          return true;
        else
          return await this.permissionService.userOrItsGroupsHavePermission(
            user,
            problem.id,
            PermissionObjectType.PROBLEM,
            PermissionType.READ
          );

      // Owner, admins and those who has write permission can write a problem
      case ProblemPermissionType.WRITE:
        if (!user) return false;
        else if (user.id === problem.ownerId) return true;
        else if (user.isAdmin) return true;
        else if (
          await this.userPrivilegeService.userHasPrivilege(
            user,
            UserPrivilegeType.MANAGE_PROBLEM
          )
        )
          return true;
        else
          return await this.permissionService.userOrItsGroupsHavePermission(
            user,
            problem.id,
            PermissionObjectType.PROBLEM,
            PermissionType.WRITE
          );

      // Owner and admins can control a problem (i.e. manage its permissions)
      case ProblemPermissionType.CONTROL:
        if (!user) return false;
        else if (user.id === problem.ownerId) return true;
        else if (user.isAdmin) return true;
        else if (
          await this.userPrivilegeService.userHasPrivilege(
            user,
            UserPrivilegeType.MANAGE_PROBLEM
          )
        )
          return true;

      // Admins can full control a problem (i.e. set it's public or not / set its display id)
      case ProblemPermissionType.FULL_CONTROL:
        if (!user) return false;
        else if (user.isAdmin) return true;
        else if (
          await this.userPrivilegeService.userHasPrivilege(
            user,
            UserPrivilegeType.MANAGE_PROBLEM
          )
        )
          return true;
    }
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

  async setProblemPermissions(
    problem: ProblemEntity,
    permissionType: PermissionType,
    users: UserEntity[],
    groups: GroupEntity[]
  ): Promise<void> {
    await this.permissionService.replaceUsersAndGroupsPermissionForObject(
      problem.id,
      PermissionObjectType.PROBLEM,
      permissionType,
      users,
      groups
    );
  }
}
