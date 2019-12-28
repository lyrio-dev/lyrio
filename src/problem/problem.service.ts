import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import {
  Connection,
  Repository,
  FindConditions,
  FindManyOptions
} from "typeorm";

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
import { UserService } from "@/user/user.service";
import { GroupService } from "@/group/group.service";

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
    private readonly userService: UserService,
    private readonly groupService: GroupService,
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

  async getUserPermission(
    user: UserEntity,
    problem?: ProblemEntity
  ): Promise<Record<ProblemPermissionType, boolean>> {
    const result: Record<ProblemPermissionType, boolean> = {
      CREATE: false,
      READ: false,
      WRITE: false,
      CONTROL: false,
      FULL_CONTROL: false
    };

    result[ProblemPermissionType.CREATE] = true;

    if (user && user.isAdmin && await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.MANAGE_PROBLEM)) {
      result[ProblemPermissionType.READ] = true;
      result[ProblemPermissionType.WRITE] = true;
      result[ProblemPermissionType.CONTROL] = true;
      result[ProblemPermissionType.FULL_CONTROL] = true;
    } else if (problem && user && problem.ownerId === user.id) {
      result[ProblemPermissionType.READ] = true;
      result[ProblemPermissionType.WRITE] = true;
      result[ProblemPermissionType.CONTROL] = true;
    } else if (problem && user && await this.permissionService.userOrItsGroupsHavePermission(
      user,
      problem.id,
      PermissionObjectType.PROBLEM,
      PermissionType.WRITE
    )) {
      result[ProblemPermissionType.READ] = true;
      result[ProblemPermissionType.WRITE] = true;
    } else if (problem && problem.isPublic) {
      result[ProblemPermissionType.READ] = true;
    }

    return result;
  }

  async queryProblemsAndCount(
    skipCount: number,
    takeCount: number
  ): Promise<[ProblemEntity[], number]> {
    let findOptions: FindManyOptions<ProblemEntity> = {
      order: {
        displayId: "ASC"
      },
      skip: skipCount,
      take: takeCount
    };
    findOptions.where = { isPublic: true };
    return await this.problemRepository.findAndCount(findOptions);
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
        problem.locales = statement.localizedContents.map(
          localizedContent => localizedContent.locale
        );
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
    await this.connection.transaction(async transactionalEntityManager => {
      if (request.samples != null) {
        const problemSample = await this.problemSampleRepository.findOne({
          problemId: problem.id
        });
        problemSample.data = request.samples;
        await transactionalEntityManager.save(problemSample);
      }

      const newLocales = request.localizedContents.map(
        localizedContent => localizedContent.locale
      );

      const deletingLocales = problem.locales.filter(
        locale => !newLocales.includes(locale)
      );
      for (const deletingLocale of deletingLocales) {
        await this.localizedContentService.delete(
          problem.id,
          LocalizedContentType.PROBLEM_TITLE,
          deletingLocale,
          transactionalEntityManager
        );
        await this.localizedContentService.delete(
          problem.id,
          LocalizedContentType.PROBLEM_CONTENT,
          deletingLocale,
          transactionalEntityManager
        );
      }

      problem.locales = newLocales;

      for (const localizedContent of request.localizedContents) {
        // Update if not null
        if (localizedContent.title != null)
          await this.localizedContentService.createOrUpdate(
            problem.id,
            LocalizedContentType.PROBLEM_TITLE,
            localizedContent.locale,
            localizedContent.title
          );
        if (localizedContent.contentSections != null)
          await this.localizedContentService.createOrUpdate(
            problem.id,
            LocalizedContentType.PROBLEM_CONTENT,
            localizedContent.locale,
            JSON.stringify(localizedContent.contentSections)
          );
      }

      await transactionalEntityManager.save(problem);
    });

    return true;
  }

  // Get a problem's title of a locale. If no title for this locale returns any one.
  async getProblemLocalizedTitle(
    problem: ProblemEntity,
    locale: Locale
  ): Promise<string> {
    return await this.localizedContentService.get(
      problem.id,
      LocalizedContentType.PROBLEM_TITLE,
      locale
    );
  }

  // Get a problem's content of a locale. If no content for this locale returns any one.
  async getProblemLocalizedContent(
    problem: ProblemEntity,
    locale: Locale
  ): Promise<ProblemContentSection[]> {
    const data = await this.localizedContentService.get(
      problem.id,
      LocalizedContentType.PROBLEM_CONTENT,
      locale
    );
    if (data != null) return JSON.parse(data);
    else return null;
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

  async getProblemPermissions(
    problem: ProblemEntity,
    permissionType: PermissionType
  ): Promise<[UserEntity[], GroupEntity[]]> {
    const [
      userIds,
      groupIds
    ] = await this.permissionService.getUsersAndGroupsWithPermission(
      problem.id,
      PermissionObjectType.PROBLEM,
      permissionType
    );
    return [
      await Promise.all(
        userIds.map(async userId => await this.userService.findUserById(userId))
      ),
      await Promise.all(
        groupIds.map(
          async groupId => await this.groupService.findGroupById(groupId)
        )
      )
    ];
  }

  async setProblemDisplayId(
    problem: ProblemEntity,
    displayId: number
  ): Promise<boolean> {
    if (!displayId) displayId = null;
    if (problem.displayId === displayId) return true;

    try {
      problem.displayId = displayId;
      await this.problemRepository.save(problem);
      return true;
    } catch (e) {
      if (
        await this.problemRepository.count({
          displayId: displayId
        })
      )
        return false;

      throw e;
    }
  }

  async setProblemPublic(
    problem: ProblemEntity,
    isPublic: boolean
  ): Promise<void> {
    if (problem.isPublic === isPublic) return;

    problem.isPublic = isPublic;
    await this.problemRepository.save(problem);
  }
}
