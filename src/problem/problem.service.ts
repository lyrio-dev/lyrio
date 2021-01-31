import { Injectable, forwardRef, Inject } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";

import { Connection, Repository, EntityManager, Brackets, In } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { GroupEntity } from "@/group/group.entity";
import { LocalizedContentService } from "@/localized-content/localized-content.service";
import { LocalizedContentEntity, LocalizedContentType } from "@/localized-content/localized-content.entity";
import { Locale } from "@/common/locale.type";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { PermissionService, PermissionObjectType } from "@/permission/permission.service";
import { UserService } from "@/user/user.service";
import { GroupService } from "@/group/group.service";
import { FileService } from "@/file/file.service";
import { ConfigService } from "@/config/config.service";
import { RedisService } from "@/redis/redis.service";
import { LockService } from "@/redis/lock.service";
import { SubmissionService } from "@/submission/submission.service";
import { AuditLogObjectType, AuditService } from "@/audit/audit.service";
import { ProblemTypeFactoryService } from "@/problem-type/problem-type-factory.service";
import { FileEntity } from "@/file/file.entity";
import { escapeLike } from "@/database/database.utils";

import { ProblemJudgeInfo } from "./problem-judge-info.interface";
import { ProblemSampleData } from "./problem-sample-data.interface";
import { ProblemContentSection } from "./problem-content.interface";
import { ProblemTagMapEntity } from "./problem-tag-map.entity";
import { ProblemTagEntity } from "./problem-tag.entity";
import { ProblemFileType, ProblemFileEntity } from "./problem-file.entity";
import { ProblemSampleEntity } from "./problem-sample.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemEntity, ProblemType } from "./problem.entity";

import { FileUploadInfoDto, SignedFileUploadRequestDto } from "@/file/dto";

import {
  ProblemStatementDto,
  UpdateProblemStatementRequestDto,
  ProblemLocalizedContentDto,
  ProblemFileDto,
  ProblemMetaDto,
  LocalizedProblemTagDto
} from "./dto";

export enum ProblemPermissionType {
  View = "View",
  Modify = "Modify",
  ManagePermission = "ManagePermission",
  ManagePublicness = "ManagePublicness",
  Delete = "Delete"
}

export enum ProblemPermissionLevel {
  Read = 1,
  Write = 2
}

/**
 * See `ProblemService.getPreprocessedJudgeInfo()`
 */
const REDIS_KEY_PROBLEM_PREPROCESSED_JUDGE_INFO = "problem-preprocessed-judge-info-and-submittable:%d";

@Injectable()
export class ProblemService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ProblemEntity)
    private readonly problemRepository: Repository<ProblemEntity>,
    @InjectRepository(ProblemJudgeInfoEntity)
    private readonly problemJudgeInfoRepository: Repository<ProblemJudgeInfoEntity>,
    @InjectRepository(ProblemSampleEntity)
    private readonly problemSampleRepository: Repository<ProblemSampleEntity>,
    @InjectRepository(ProblemFileEntity)
    private readonly problemFileRepository: Repository<ProblemFileEntity>,
    @InjectRepository(ProblemTagEntity)
    private readonly problemTagRepository: Repository<ProblemTagEntity>,
    @InjectRepository(ProblemTagMapEntity)
    private readonly problemTagMapRepository: Repository<ProblemTagMapEntity>,
    private readonly problemTypeFactoryService: ProblemTypeFactoryService,
    private readonly localizedContentService: LocalizedContentService,
    @Inject(forwardRef(() => UserPrivilegeService))
    private readonly userPrivilegeService: UserPrivilegeService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    private readonly permissionService: PermissionService,
    private readonly fileService: FileService,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly lockService: LockService,
    private readonly auditService: AuditService
  ) {
    this.auditService.registerObjectTypeQueryHandler(AuditLogObjectType.Problem, async (problemId, locale) => {
      const problem = await this.findProblemById(problemId);
      return !problem
        ? null
        : await Promise.all([
            this.getProblemMeta(problem),
            this.getProblemLocalizedTitle(problem, problem.locales.includes(locale) ? locale : problem.locales[0])
          ]);
    });

    this.auditService.registerObjectTypeQueryHandler(AuditLogObjectType.ProblemTag, async (problemTagId, locale) => {
      const problemTag = await this.findProblemTagById(problemTagId);
      return !problemTag ? null : await this.getProblemTagLocalized(problemTag, locale);
    });
  }

  async findProblemById(id: number): Promise<ProblemEntity> {
    return await this.problemRepository.findOne(id);
  }

  async findProblemsByExistingIds(problemIds: number[]): Promise<ProblemEntity[]> {
    if (problemIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(problemIds));
    const records = await this.problemRepository.findByIds(uniqueIds);
    const map = Object.fromEntries(records.map(record => [record.id, record]));
    return problemIds.map(problemId => map[problemId]);
  }

  async findProblemByDisplayId(displayId: number): Promise<ProblemEntity> {
    return await this.problemRepository.findOne({
      displayId
    });
  }

  async getProblemMeta(problem: ProblemEntity, includeStatistics?: boolean): Promise<ProblemMetaDto> {
    const meta: ProblemMetaDto = {
      id: problem.id,
      displayId: problem.displayId,
      type: problem.type,
      publicTime: problem.publicTime,
      isPublic: problem.isPublic,
      ownerId: problem.ownerId,
      locales: problem.locales
    };

    if (includeStatistics) {
      meta.acceptedSubmissionCount = problem.acceptedSubmissionCount;
      meta.submissionCount = problem.submissionCount;
    }

    return meta;
  }

  async userHasPermission(
    user: UserEntity,
    problem: ProblemEntity,
    type: ProblemPermissionType,
    hasPrivilege?: boolean
  ): Promise<boolean> {
    switch (type) {
      // Everyone can view a public problem
      // Owner, admins and those who has read permission can view a non-public problem
      case ProblemPermissionType.View:
        if (problem.isPublic) return true;
        if (user && user.id === problem.ownerId) return true;
        if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageProblem)))
          return true;
        else
          return await this.permissionService.userOrItsGroupsHavePermission(
            user,
            problem.id,
            PermissionObjectType.Problem,
            ProblemPermissionLevel.Read
          );

      // Owner, admins and those who has write permission can modify a problem
      case ProblemPermissionType.Modify:
        if (
          user &&
          user.id === problem.ownerId &&
          (!problem.isPublic || this.configService.config.preference.security.allowNonPrivilegedUserEditPublicProblem)
        )
          return true;
        if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageProblem)))
          return true;
        else
          return (
            (await this.permissionService.userOrItsGroupsHavePermission(
              user,
              problem.id,
              PermissionObjectType.Problem,
              ProblemPermissionLevel.Write
            )) &&
            (!problem.isPublic || this.configService.config.preference.security.allowNonPrivilegedUserEditPublicProblem)
          );

      // Admins can manage a problem's permission
      // Controlled by the application preference, the owner may have the permission
      case ProblemPermissionType.ManagePermission:
        if (
          user &&
          user.id === problem.ownerId &&
          this.configService.config.preference.security.allowOwnerManageProblemPermission &&
          (!problem.isPublic || this.configService.config.preference.security.allowNonPrivilegedUserEditPublicProblem)
        )
          return true;
        else if (
          hasPrivilege ??
          (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageProblem))
        )
          return true;
        else return false;

      // Admins can manage a problem's publicness (set display id / make public or non-public)
      case ProblemPermissionType.ManagePublicness:
        if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageProblem)))
          return true;
        else return false;

      // Admins can delete a problem
      // Controlled by the application preference, the owner may have the permission
      case ProblemPermissionType.Delete:
        if (
          user &&
          user.id === problem.ownerId &&
          this.configService.config.preference.security.allowOwnerDeleteProblem &&
          (!problem.isPublic || this.configService.config.preference.security.allowNonPrivilegedUserEditPublicProblem)
        )
          return true;
        else if (
          hasPrivilege ??
          (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageProblem))
        )
          return true;
        else return false;

      default:
        return false;
    }
  }

  async getUserPermissions(user: UserEntity, problem: ProblemEntity): Promise<ProblemPermissionType[]> {
    if (!user) return problem.isPublic ? [ProblemPermissionType.View] : [];
    if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageProblem))
      return Object.values(ProblemPermissionType);

    const permissionLevel = await this.permissionService.getUserOrItsGroupsMaxPermissionLevel<ProblemPermissionLevel>(
      user,
      problem.id,
      PermissionObjectType.Problem
    );
    const result: ProblemPermissionType[] = [];
    if (problem.isPublic || permissionLevel >= ProblemPermissionLevel.Read || problem.ownerId === user.id)
      result.push(ProblemPermissionType.View);
    if (
      (problem.ownerId === user.id || permissionLevel >= ProblemPermissionLevel.Write) &&
      (!problem.isPublic || this.configService.config.preference.security.allowNonPrivilegedUserEditPublicProblem)
    )
      result.push(ProblemPermissionType.Modify);
    if (
      problem.ownerId === user.id &&
      this.configService.config.preference.security.allowOwnerManageProblemPermission &&
      (!problem.isPublic || this.configService.config.preference.security.allowNonPrivilegedUserEditPublicProblem)
    )
      result.push(ProblemPermissionType.ManagePermission);
    if (
      problem.ownerId === user.id &&
      this.configService.config.preference.security.allowOwnerDeleteProblem &&
      (!problem.isPublic || this.configService.config.preference.security.allowNonPrivilegedUserEditPublicProblem)
    )
      result.push(ProblemPermissionType.Delete);
    return result;
  }

  async userHasCreateProblemPermission(user: UserEntity): Promise<boolean> {
    if (!user) return false;
    if (this.configService.config.preference.security.allowEveryoneCreateProblem) return true;
    return await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageProblem);
  }

  /**
   * Query problem set with pagination.
   *
   * If the user has manage problem privilege, show all problems.
   * If the user has no manage problem privilege, show only public and the user owned problems.
   *
   * Sort: problems with display ID first (by displayId asc), then without display ID (by id asc).
   */
  async queryProblemsAndCount(
    currentUser: UserEntity,
    hasPrivilege: boolean,
    keyword: string,
    tagIds: number[],
    ownerId: number,
    nonpublic: boolean,
    skipCount: number,
    takeCount: number
  ): Promise<[problems: ProblemEntity[], count: number]> {
    const queryBuilder = this.problemRepository.createQueryBuilder("problem").select("problem.id", "id");
    let groupByAdded = false;

    if (tagIds && tagIds.length > 0) {
      queryBuilder
        .innerJoin(ProblemTagMapEntity, "map", "problem.id = map.problemId")
        .andWhere("map.problemTagId IN (:...tagIds)", { tagIds })
        .groupBy("problem.id");
      groupByAdded = true;
      if (tagIds.length > 1) queryBuilder.having("COUNT(DISTINCT map.problemTagId) = :count", { count: tagIds.length });
    }

    if (keyword) {
      queryBuilder
        .innerJoin(
          LocalizedContentEntity,
          "localizedContent",
          "localizedContent.type = :type AND problem.id = localizedContent.objectId",
          { type: LocalizedContentType.ProblemTitle }
        )
        .andWhere("localizedContent.data LIKE :like", { like: `%${escapeLike(keyword)}%` });

      if (!groupByAdded) queryBuilder.groupBy("problem.id");
    }

    if (!hasPrivilege && !(currentUser && ownerId === currentUser.id)) {
      if (currentUser)
        queryBuilder.andWhere(
          new Brackets(brackets =>
            brackets.where("problem.isPublic = 1").orWhere("problem.ownerId = :ownerId", { ownerId: currentUser.id })
          )
        );
      else queryBuilder.andWhere("problem.isPublic = 1");
    } else if (nonpublic) {
      queryBuilder.andWhere("problem.isPublic = 0");
    }
    if (ownerId) {
      queryBuilder.andWhere("problem.ownerId = :ownerId", { ownerId });
    }

    // QueryBuilder.getManyAndCount() has bug with GROUP BY
    const count = Number(
      (
        await this.connection
          .createQueryBuilder()
          .select("COUNT(*)", "count")
          .from(`(${queryBuilder.getQuery()})`, "temp")
          .setParameters(queryBuilder.expressionMap.parameters)
          .getRawOne()
      ).count
    );

    queryBuilder
      .orderBy("problem.displayId IS NOT NULL", "DESC")
      .addOrderBy("problem.displayId", "ASC")
      .addOrderBy("problem.id", "ASC");
    const result = await queryBuilder.limit(takeCount).offset(skipCount).getRawMany();
    return [await this.findProblemsByExistingIds(result.map(row => row.id)), count];
  }

  async getLatestUpdatedProblems(takeCount: number): Promise<ProblemEntity[]> {
    return await this.problemRepository.find({
      where: {
        isPublic: true
      },
      order: {
        publicTime: "DESC"
      },
      take: takeCount
    });
  }

  async createProblem(
    owner: UserEntity,
    type: ProblemType,
    statement: ProblemStatementDto,
    tags: ProblemTagEntity[]
  ): Promise<ProblemEntity> {
    let problem: ProblemEntity;
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      problem = new ProblemEntity();
      problem.displayId = null;
      problem.type = type;
      problem.isPublic = false;
      problem.ownerId = owner.id;
      problem.locales = statement.localizedContents.map(localizedContent => localizedContent.locale);
      problem.submissionCount = 0;
      problem.acceptedSubmissionCount = 0;
      await transactionalEntityManager.save(problem);

      const problemJudgeInfo = new ProblemJudgeInfoEntity();
      problemJudgeInfo.problemId = problem.id;
      problemJudgeInfo.judgeInfo = this.problemTypeFactoryService.type(type).getDefaultJudgeInfo();
      await transactionalEntityManager.save(problemJudgeInfo);

      const problemSample = new ProblemSampleEntity();
      problemSample.problemId = problem.id;
      problemSample.data = statement.samples;
      await transactionalEntityManager.save(problemSample);

      for (const localizedContent of statement.localizedContents) {
        // eslint-disable-next-line no-await-in-loop
        await this.localizedContentService.createOrUpdate(
          problem.id,
          LocalizedContentType.ProblemTitle,
          localizedContent.locale,
          localizedContent.title,
          transactionalEntityManager
        );
        // eslint-disable-next-line no-await-in-loop
        await this.localizedContentService.createOrUpdate(
          problem.id,
          LocalizedContentType.ProblemContent,
          localizedContent.locale,
          JSON.stringify(localizedContent.contentSections),
          transactionalEntityManager
        );
      }
      /* eslint-enable no-await-in-loop */

      await this.setProblemTags(problem, tags, transactionalEntityManager);
    });

    return problem;
  }

  async updateProblemStatement(
    problem: ProblemEntity,
    request: UpdateProblemStatementRequestDto,
    tags: ProblemTagEntity[]
  ): Promise<boolean> {
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const problemSample = await transactionalEntityManager.findOne(ProblemSampleEntity, {
        problemId: problem.id
      });
      problemSample.data = request.samples;
      await transactionalEntityManager.save(problemSample);

      const newLocales = request.localizedContents.map(localizedContent => localizedContent.locale);

      const deletingLocales = problem.locales.filter(locale => !newLocales.includes(locale));
      for (const deletingLocale of deletingLocales) {
        // eslint-disable-next-line no-await-in-loop
        await this.localizedContentService.delete(
          problem.id,
          LocalizedContentType.ProblemTitle,
          deletingLocale,
          transactionalEntityManager
        );
        // eslint-disable-next-line no-await-in-loop
        await this.localizedContentService.delete(
          problem.id,
          LocalizedContentType.ProblemContent,
          deletingLocale,
          transactionalEntityManager
        );
      }

      problem.locales = newLocales;

      for (const localizedContent of request.localizedContents) {
        // eslint-disable-next-line no-await-in-loop
        await this.localizedContentService.createOrUpdate(
          problem.id,
          LocalizedContentType.ProblemTitle,
          localizedContent.locale,
          localizedContent.title,
          transactionalEntityManager
        );
        // eslint-disable-next-line no-await-in-loop
        await this.localizedContentService.createOrUpdate(
          problem.id,
          LocalizedContentType.ProblemContent,
          localizedContent.locale,
          JSON.stringify(localizedContent.contentSections),
          transactionalEntityManager
        );
      }

      await this.setProblemTags(problem, tags, transactionalEntityManager);

      await transactionalEntityManager.save(problem);
    });

    return true;
  }

  async updateProblemJudgeInfo(
    problem: ProblemEntity,
    judgeInfo: ProblemJudgeInfo,
    submittable: boolean,
    ignoreLimitsOnValidation: boolean
  ): Promise<string[]> {
    const testData = await this.getProblemFiles(problem, ProblemFileType.TestData);
    try {
      this.problemTypeFactoryService
        .type(problem.type)
        .validateAndFilterJudgeInfo(judgeInfo, testData, ignoreLimitsOnValidation);
    } catch (e) {
      if (Array.isArray(e)) return e;
      throw e;
    }

    const problemJudgeInfo = await this.problemJudgeInfoRepository.findOne({
      problemId: problem.id
    });

    problemJudgeInfo.judgeInfo = judgeInfo;
    problemJudgeInfo.submittable = submittable;
    await this.problemJudgeInfoRepository.save(problemJudgeInfo);

    await this.redisService.cacheDelete(REDIS_KEY_PROBLEM_PREPROCESSED_JUDGE_INFO.format(problem.id));

    return null;
  }

  async getProblemLocalizedTitle(problem: ProblemEntity, locale: Locale): Promise<string> {
    return await this.localizedContentService.get(problem.id, LocalizedContentType.ProblemTitle, locale);
  }

  async getProblemLocalizedContent(problem: ProblemEntity, locale: Locale): Promise<ProblemContentSection[]> {
    const data = await this.localizedContentService.get(problem.id, LocalizedContentType.ProblemContent, locale);
    if (data != null) return JSON.parse(data);
    return null;
  }

  async getProblemAllLocalizedContents(problem: ProblemEntity): Promise<ProblemLocalizedContentDto[]> {
    const [titles, contents] = await Promise.all([
      this.localizedContentService.getOfAllLocales(problem.id, LocalizedContentType.ProblemTitle),
      this.localizedContentService.getOfAllLocales(problem.id, LocalizedContentType.ProblemContent)
    ]);
    return Object.keys(titles).map((locale: Locale) => ({
      locale,
      title: titles[locale],
      contentSections: JSON.parse(contents[locale])
    }));
  }

  async getProblemSamples(problem: ProblemEntity): Promise<ProblemSampleData> {
    const problemSample = await this.problemSampleRepository.findOne({ problemId: problem.id });
    return problemSample.data;
  }

  async getProblemJudgeInfo(problem: ProblemEntity): Promise<[judgeInfo: ProblemJudgeInfo, submittable: boolean]> {
    const problemJudgeInfo = await this.problemJudgeInfoRepository.findOne({ problemId: problem.id });
    return [problemJudgeInfo.judgeInfo, problemJudgeInfo.submittable];
  }

  /**
   * Judge info needs to be preprocessed before sending to clients or judge clients.
   * Currently preprocessing is detecting testcases from testdata files.
   *
   * The cache gets cleared when the testdata files or judge info changed.
   */
  async getProblemPreprocessedJudgeInfo(
    problem: ProblemEntity
  ): Promise<[judgeInfo: ProblemJudgeInfo, submittable: boolean]> {
    const key = REDIS_KEY_PROBLEM_PREPROCESSED_JUDGE_INFO.format(problem.id);
    const cachedResult: [judgeInfo: ProblemJudgeInfo, submittable: boolean] = JSON.parse(
      await this.redisService.cacheGet(key)
    );
    if (cachedResult) return cachedResult;

    const [judgeInfo, submittable] = await this.getProblemJudgeInfo(problem);
    const preprocessed = this.problemTypeFactoryService
      .type(problem.type)
      .preprocessJudgeInfo(judgeInfo, await this.getProblemFiles(problem, ProblemFileType.TestData));
    await this.redisService.cacheSet(key, JSON.stringify([preprocessed, submittable]));

    return [preprocessed, submittable];
  }

  /**
   * @param problem Should be locked by `ProblemService.lockProblemById(id, "Read")`.
   */
  async setProblemPermissions(
    problem: ProblemEntity,
    userPermissions: [user: UserEntity, permission: ProblemPermissionLevel][],
    groupPermissions: [group: GroupEntity, permission: ProblemPermissionLevel][]
  ): Promise<void> {
    await this.lockProblemById(
      problem.id,
      "Read",
      // eslint-disable-next-line @typescript-eslint/no-shadow
      async problem =>
        await this.permissionService.replaceUsersAndGroupsPermissionForObject(
          problem.id,
          PermissionObjectType.Problem,
          userPermissions,
          groupPermissions
        )
    );
  }

  async getProblemPermissionsWithId(
    problem: ProblemEntity
  ): Promise<
    [[userId: number, permission: ProblemPermissionLevel][], [groupId: number, permission: ProblemPermissionLevel][]]
  > {
    return await this.permissionService.getUserAndGroupPermissionListOfObject<ProblemPermissionLevel>(
      problem.id,
      PermissionObjectType.Problem
    );
  }

  async getProblemPermissions(
    problem: ProblemEntity
  ): Promise<
    [
      [user: UserEntity, permission: ProblemPermissionLevel][],
      [group: GroupEntity, permission: ProblemPermissionLevel][]
    ]
  > {
    const [userPermissionList, groupPermissionList] = await this.getProblemPermissionsWithId(problem);
    return [
      await Promise.all(
        userPermissionList.map(
          async ([userId, permission]): Promise<[user: UserEntity, permission: ProblemPermissionLevel]> => [
            await this.userService.findUserById(userId),
            permission
          ]
        )
      ),
      await Promise.all(
        groupPermissionList.map(
          async ([groupId, permission]): Promise<[group: GroupEntity, problem: ProblemPermissionLevel]> => [
            await this.groupService.findGroupById(groupId),
            permission
          ]
        )
      )
    ];
  }

  async setProblemDisplayId(problem: ProblemEntity, displayId: number): Promise<boolean> {
    if (!displayId) displayId = null;
    if (problem.displayId === displayId) return true;

    try {
      problem.displayId = displayId;
      await this.problemRepository.save(problem);
      return true;
    } catch (e) {
      if (
        await this.problemRepository.count({
          displayId
        })
      )
        return false;

      throw e;
    }
  }

  async setProblemPublic(problem: ProblemEntity, isPublic: boolean): Promise<void> {
    problem.isPublic = isPublic;
    if (isPublic) problem.publicTime = new Date();
    await this.problemRepository.save(problem);
  }

  private async checkAddProblemFileLimit(
    problem: ProblemEntity,
    type: ProblemFileType,
    size: number,
    filename: string,
    transactionalEntityManager: EntityManager
  ): Promise<"TOO_MANY_FILES" | "TOTAL_SIZE_TOO_LARGE"> {
    const currentFiles = await transactionalEntityManager.find(ProblemFileEntity, { problemId: problem.id, type });
    const fileSizes = await this.fileService.getFileSizes(
      currentFiles.map(file => file.uuid),
      transactionalEntityManager
    );

    let oldFileCount = 0;
    let oldFileSizeSum = 0;
    for (const i of currentFiles.keys()) {
      const file = currentFiles[i];
      if (file.filename === filename) continue;

      oldFileCount++;
      oldFileSizeSum += fileSizes[i];
    }

    // Get the corresponding limits from config
    const [filesLimit, sizeLimit] = {
      [ProblemFileType.TestData]: [
        this.configService.config.resourceLimit.problemTestdataFiles,
        this.configService.config.resourceLimit.problemTestdataSize
      ],
      [ProblemFileType.AdditionalFile]: [
        this.configService.config.resourceLimit.problemAdditionalFileFiles,
        this.configService.config.resourceLimit.problemAdditionalFileSize
      ]
    }[type];

    if (oldFileCount + 1 > filesLimit) return "TOO_MANY_FILES";
    if (oldFileSizeSum + size > sizeLimit) return "TOTAL_SIZE_TOO_LARGE";

    return null;
  }

  // Manage problem file actions should be locked to make sure the limit check works.
  private async lockManageProblemFile<T>(
    problemId: number,
    type: ProblemFileType,
    callback: (problem: ProblemEntity) => Promise<T>
  ): Promise<T> {
    return await this.lockProblemById(
      problemId,
      "Read",
      async problem =>
        await this.lockService.lock(`ManageProblemFile_${type}_${problem.id}`, async () => await callback(problem))
    );
  }

  /**
   * @error "NO_SUCH_PROBLEM"
   *
   * If the user have not uploaded the file, the uuid should be null.
   * It will return [UUID, upload request info] if success and error message if limit exceeded.
   * @error "TOO_MANY_FILES" | "TOTAL_SIZE_TOO_LARGE"
   *
   * If the user have uploaded the file, the uuid should be the uploaded file UUID.
   * It will return null if success and error message if failed.
   * @error "FILE_UUID_EXISTS" | "FILE_NOT_UPLOADED"
   */
  async addProblemFile(
    problem: ProblemEntity,
    type: ProblemFileType,
    uploadInfo: FileUploadInfoDto,
    filename: string,
    noLimit: boolean
  ): Promise<
    | SignedFileUploadRequestDto
    | "NO_SUCH_PROBLEM"
    | "TOO_MANY_FILES"
    | "TOTAL_SIZE_TOO_LARGE"
    | "FILE_UUID_EXISTS"
    | "FILE_NOT_UPLOADED"
  > {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    return await this.lockManageProblemFile(problem.id, type, async problem => {
      if (!problem) return "NO_SUCH_PROBLEM";

      let deleteOldFileActually: () => void = null;
      const ret = await this.connection.transaction("REPEATABLE READ", async transactionalEntityManager => {
        const result = await this.fileService.processUploadRequest(
          uploadInfo,
          async size =>
            noLimit
              ? null
              : await this.checkAddProblemFileLimit(problem, type, size, filename, transactionalEntityManager),
          transactionalEntityManager
        );

        // SignedFileUploadRequestDto object or error
        if (!(result instanceof FileEntity)) return result;

        const oldProblemFile = await transactionalEntityManager.findOne(ProblemFileEntity, {
          problemId: problem.id,
          type,
          filename
        });
        if (oldProblemFile)
          deleteOldFileActually = await this.fileService.deleteFile(oldProblemFile.uuid, transactionalEntityManager);

        const problemFile = new ProblemFileEntity();
        problemFile.problemId = problem.id;
        problemFile.type = type;
        problemFile.filename = filename;
        problemFile.uuid = uploadInfo.uuid;

        await transactionalEntityManager.save(ProblemFileEntity, problemFile);

        return null;
      });

      if (deleteOldFileActually) deleteOldFileActually();
      if (type === ProblemFileType.TestData)
        await this.redisService.cacheDelete(REDIS_KEY_PROBLEM_PREPROCESSED_JUDGE_INFO.format(problem.id));

      return ret;
    });
  }

  async removeProblemFiles(problem: ProblemEntity, type: ProblemFileType, filenames: string[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    return await this.lockManageProblemFile(problem.id, type, async problem => {
      if (!problem) return;

      let deleteFilesActually: () => void = null;
      await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        const problemFiles = await transactionalEntityManager.find(ProblemFileEntity, {
          problemId: problem.id,
          type,
          filename: In(filenames)
        });

        await transactionalEntityManager.delete(ProblemFileEntity, {
          problemId: problem.id,
          type,
          filename: In(filenames)
        });

        deleteFilesActually = await this.fileService.deleteFile(
          problemFiles.map(problemFile => problemFile.uuid),
          transactionalEntityManager
        );
      });

      if (deleteFilesActually) deleteFilesActually();
      if (type === ProblemFileType.TestData)
        await this.redisService.cacheDelete(REDIS_KEY_PROBLEM_PREPROCESSED_JUDGE_INFO.format(problem.id));
    });
  }

  async getProblemFiles(
    problem: ProblemEntity,
    type: ProblemFileType,
    transcationalEntityManager?: EntityManager
  ): Promise<ProblemFileEntity[]> {
    const problemFiles = transcationalEntityManager
      ? await transcationalEntityManager.find(ProblemFileEntity, {
          problemId: problem.id,
          type
        })
      : await this.problemFileRepository.find({
          problemId: problem.id,
          type
        });

    return problemFiles;
  }

  async listProblemFiles(problem: ProblemEntity, type: ProblemFileType, withSize = false): Promise<ProblemFileDto[]> {
    return await this.connection.transaction("REPEATABLE READ", async transcationalEntityManager => {
      const problemFiles = await this.getProblemFiles(problem, type, transcationalEntityManager);

      if (withSize) {
        const fileSizes = await this.fileService.getFileSizes(
          problemFiles.map(problemFile => problemFile.uuid),
          transcationalEntityManager
        );
        return problemFiles.map((problemFile, i) => ({
          ...problemFile,
          size: fileSizes[i]
        }));
      }

      return problemFiles;
    });
  }

  async renameProblemFile(
    problem: ProblemEntity,
    type: ProblemFileType,
    filename: string,
    newFilename: string
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    return await this.lockManageProblemFile(problem.id, type, async problem => {
      if (!problem) return false;

      const problemFile = await this.problemFileRepository.findOne({
        problemId: problem.id,
        type,
        filename
      });

      if (!problemFile) return false;

      // Since filename is a PRIMARY key, use .save() will create another record
      await this.problemFileRepository.update(problemFile, {
        filename: newFilename
      });

      if (type === ProblemFileType.TestData)
        await this.redisService.cacheDelete(REDIS_KEY_PROBLEM_PREPROCESSED_JUDGE_INFO.format(problem.id));

      return true;
    });
  }

  async updateProblemStatistics(
    problemId: number,
    incSubmissionCount: number,
    incAcceptedSubmissionCount: number
  ): Promise<void> {
    if (incSubmissionCount !== 0) {
      await this.problemRepository.increment({ id: problemId }, "submissionCount", incSubmissionCount);
    }

    if (incAcceptedSubmissionCount !== 0) {
      await this.problemRepository.increment({ id: problemId }, "acceptedSubmissionCount", incAcceptedSubmissionCount);
    }
  }

  async findProblemTagById(id: number): Promise<ProblemTagEntity> {
    return await this.problemTagRepository.findOne(id);
  }

  async findProblemTagsByExistingIds(problemTagIds: number[]): Promise<ProblemTagEntity[]> {
    if (problemTagIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(problemTagIds));
    const records = await this.problemTagRepository.findByIds(uniqueIds);
    const map = Object.fromEntries(records.map(record => [record.id, record]));
    return problemTagIds.map(problemId => map[problemId]);
  }

  async getAllProblemTags(): Promise<ProblemTagEntity[]> {
    return await this.problemTagRepository.find();
  }

  async createProblemTag(localizedNames: [Locale, string][], color: string): Promise<ProblemTagEntity> {
    return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const problemTag = new ProblemTagEntity();
      problemTag.color = color;
      problemTag.locales = localizedNames.map(([locale]) => locale);
      await transactionalEntityManager.save(problemTag);

      for (const [locale, name] of localizedNames) {
        // eslint-disable-next-line no-await-in-loop
        await this.localizedContentService.createOrUpdate(
          problemTag.id,
          LocalizedContentType.ProblemTagName,
          locale,
          name,
          transactionalEntityManager
        );
      }

      return problemTag;
    });
  }

  async updateProblemTag(
    problemTag: ProblemTagEntity,
    localizedNames: [Locale, string][],
    color: string
  ): Promise<void> {
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      problemTag.color = color;
      problemTag.locales = localizedNames.map(([locale]) => locale);
      await transactionalEntityManager.save(problemTag);

      await this.localizedContentService.delete(
        problemTag.id,
        LocalizedContentType.ProblemTagName,
        null,
        transactionalEntityManager
      );
      for (const [locale, name] of localizedNames) {
        // eslint-disable-next-line no-await-in-loop
        await this.localizedContentService.createOrUpdate(
          problemTag.id,
          LocalizedContentType.ProblemTagName,
          locale,
          name,
          transactionalEntityManager
        );
      }
    });
  }

  async deleteProblemTag(problemTag: ProblemTagEntity): Promise<void> {
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      await transactionalEntityManager.delete(ProblemTagEntity, {
        id: problemTag.id
      });

      await this.localizedContentService.delete(
        problemTag.id,
        LocalizedContentType.ProblemTagName,
        null,
        transactionalEntityManager
      );
    });
  }

  async getProblemTagLocalizedName(problemTag: ProblemTagEntity, locale: Locale): Promise<string> {
    return await this.localizedContentService.get(problemTag.id, LocalizedContentType.ProblemTagName, locale);
  }

  /**
   * Get the tag dto with localized name of requested locale, if not available, the name of default locale is used.
   */
  async getProblemTagLocalized(problemTag: ProblemTagEntity, locale: Locale): Promise<LocalizedProblemTagDto> {
    const nameLocale = problemTag.locales.includes(locale) ? locale : problemTag.locales[0];
    const name = await this.getProblemTagLocalizedName(problemTag, nameLocale);
    return {
      id: problemTag.id,
      color: problemTag.color,
      name,
      nameLocale
    };
  }

  async getProblemTagAllLocalizedNames(problemTag: ProblemTagEntity): Promise<Partial<Record<Locale, string>>> {
    return await this.localizedContentService.getOfAllLocales(problemTag.id, LocalizedContentType.ProblemTagName);
  }

  async setProblemTags(
    problem: ProblemEntity,
    problemTags: ProblemTagEntity[],
    transactionalEntityManager: EntityManager
  ): Promise<void> {
    await transactionalEntityManager.delete(ProblemTagMapEntity, {
      problemId: problem.id
    });
    if (problemTags.length === 0) return;
    await transactionalEntityManager
      .createQueryBuilder()
      .insert()
      .into(ProblemTagMapEntity)
      .values(problemTags.map(problemTag => ({ problemId: problem.id, problemTagId: problemTag.id })))
      .execute();
  }

  async getProblemTagIdsByProblem(problem: ProblemEntity): Promise<number[]> {
    const problemTagMaps = await this.problemTagMapRepository.find({
      problemId: problem.id
    });

    return problemTagMaps.map(problemTagMap => problemTagMap.problemTagId);
  }

  async getProblemTagsByProblem(problem: ProblemEntity): Promise<ProblemTagEntity[]> {
    return await this.findProblemTagsByExistingIds(await this.getProblemTagIdsByProblem(problem));
  }

  /**
   * Lock a problem by ID with Read/Write Lock.
   * @param type `"Read"` to ensure the problem exists while holding the lock, `"Write"` is for deleting the problem.
   */
  async lockProblemById<T>(
    id: number,
    type: "Read" | "Write",
    callback: (problem: ProblemEntity) => Promise<T>
  ): Promise<T> {
    return await this.lockService.lockReadWrite(
      `AcquireProblem_${id}`,
      type,
      async () => await callback(await this.findProblemById(id))
    );
  }

  /**
   * @param problem Must be locked by `ProblemService.lockProblemById(id, "Write")`.
   */
  async deleteProblem(problem: ProblemEntity): Promise<void> {
    let deleteFilesActually: () => void = null;
    await this.connection.transaction("REPEATABLE READ", async transactionalEntityManager => {
      // update user submission count and accepted problem count
      await this.userService.onDeleteProblem(problem.id, transactionalEntityManager);

      // delete files
      const problemFiles = await transactionalEntityManager.find(ProblemFileEntity, {
        problemId: problem.id
      });
      deleteFilesActually = await this.fileService.deleteFile(
        problemFiles.map(problemFile => problemFile.uuid),
        transactionalEntityManager
      );
      await transactionalEntityManager.remove(problemFiles);

      // delete permissions
      await this.permissionService.replaceUsersAndGroupsPermissionForObject(
        problem.id,
        PermissionObjectType.Problem,
        [],
        [],
        transactionalEntityManager
      );

      // cancel submissions
      await this.submissionService.onDeleteProblem(problem.id);

      // delete everything
      await transactionalEntityManager.remove(problem);
    });
    if (deleteFilesActually) deleteFilesActually();
    await this.submissionService.onProblemDeleted(problem.id);
  }

  /**
   * @param problem Must be locked by `ProblemService.lockProblemById(id, "Write")`.
   */
  async changeProblemType(problem: ProblemEntity, type: ProblemType): Promise<boolean> {
    if (await this.submissionService.problemHasAnySubmission(problem)) return false;
    problem.type = type;
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      await transactionalEntityManager.save(problem);
      await transactionalEntityManager.update(
        ProblemJudgeInfoEntity,
        {
          problemId: problem.id
        },
        {
          judgeInfo: this.problemTypeFactoryService.type(type).getDefaultJudgeInfo()
        }
      );
    });
    return true;
  }
}
