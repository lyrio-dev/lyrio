import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";

import { Connection, MoreThan, Not, Repository } from "typeorm";
import moment from "moment";

import { AuditLogObjectType, AuditService } from "@/audit/audit.service";
import { Locale } from "@/common/locale.type";
import { LocalizedContentType } from "@/localized-content/localized-content.entity";
import { LocalizedContentService } from "@/localized-content/localized-content.service";
import { ProblemEntity } from "@/problem/problem.entity";
import { ProblemService } from "@/problem/problem.service";
import { LockService } from "@/redis/lock.service";
import { SubmissionEntity } from "@/submission/submission.entity";
import { SubmissionService } from "@/submission/submission.service";
import { UserEntity } from "@/user/user.entity";
import {
  AccessControlList,
  AccessControlListWithSubjectMeta,
  PermissionObjectType,
  PermissionService
} from "@/permission/permission.service";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { UserService } from "@/user/user.service";
import { PushGateway, PushService } from "@/push/push.gateway";
import { RedisService } from "@/redis/redis.service";
import { invalidSubmissionStatus, SubmissionStatus } from "@/submission/submission-status.enum";
import { SubmissionProgressVisibility } from "@/submission/submission-progress.gateway";
import { BackgroundTaskProgressService } from "@/push/background-task-progress.service";
import { doGroupedBatchOperation } from "@/common/do-grouped-batch-operation";

import { ContestEntity, ContestPublicness } from "./contest.entity";
import { ContestAnnouncementEntity } from "./contest-announcement.entity";
import { ContestProblemEntity } from "./contest-problem.entity";
import { ContestParticipantEntity } from "./contest-participant.entity";
import { ContestIssueEntity } from "./contest-issue.entity";
import { ContestConfigEntity } from "./contest-config.entity";
import { ContestParticipantProblemStatisticsEntity } from "./contest-participant-problem-statistics.entity";
import { ContestTypeFactoryService } from "./contest-type-factory.service";
import { ContestOptions } from "./contest-options.interface";

import type {
  ContestInformationDto,
  ContestMetaDto,
  ContestAnnouncementDto,
  ContestIssueDto,
  ContestAnnouncementLocalizedContentDto
} from "./dto";

export enum ContestPermissionType {
  View = "View",
  Participate = "Participate",
  Inspect = "Inspect",
  Modify = "Modify"
}

Error.stackTraceLimit = 999;
console.log(new Error)

export enum ContestUserRole {
  Participant = "Participant",
  Inspector = "Inspector",
  Admin = "Admin"
}

export enum ContestPermissionLevel {
  // Able to view the contest (only after ended)
  View = 1,
  // Able to register and participate in the contest
  Participate = 2,
  // Able to view the contest, annouce, and reply issues
  Inspect = 3,
  // Able to edit the contest
  Modify = 4
}

interface ContestAnnouncementPushSubscription {
  contestId: number;
  latestAnnouncementId: number;
}

interface ContestIssuePushSubscription {
  contestId: number;
  // For inspectors this is null.
  userId?: number;
  // For inspectors this is the latest posted issue. For participant this is the latest answered issue.
  latestTime: Date;
}

const REDIS_KEY_CONTEST_META = "contest-meta:%d";

const BACKGROUND_TASK_CONTEST_REJUDGE = "contest-rejudge:%d";

@Injectable()
export class ContestService {
  /**
   * `room`: `${contestId}`
   */
  private readonly contestAnnouncementPushService: PushService<
    ContestAnnouncementPushSubscription,
    Record<number, ContestAnnouncementDto>
  >;

  /**
   * `room`: `${contestId}` for inspectors, `${contestId}:${userId}` for participants.
   */
  private readonly contestIssuePushService: PushService<ContestIssuePushSubscription, Record<number, ContestIssueDto>>;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ContestEntity)
    private readonly contestRepository: Repository<ContestEntity>,
    @InjectRepository(ContestConfigEntity)
    private readonly contestConfigRepository: Repository<ContestConfigEntity>,
    @InjectRepository(ContestAnnouncementEntity)
    private readonly contestAnnouncementRepository: Repository<ContestAnnouncementEntity>,
    @InjectRepository(ContestProblemEntity)
    private readonly contestProblemRepository: Repository<ContestProblemEntity>,
    @InjectRepository(ContestParticipantEntity)
    private readonly contestParticipantRepository: Repository<ContestParticipantEntity>,
    @InjectRepository(ContestIssueEntity)
    private readonly contestIssueRepository: Repository<ContestIssueEntity>,
    @InjectRepository(ContestParticipantProblemStatisticsEntity)
    private readonly contestParticipantProblemStatisticsRepository: Repository<ContestParticipantProblemStatisticsEntity>,
    private readonly contestTypeFactoryService: ContestTypeFactoryService,
    private readonly auditService: AuditService,
    private readonly lockService: LockService,
    @Inject(forwardRef(() => ProblemService))
    private readonly problemService: ProblemService,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly localizedContentService: LocalizedContentService,
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
    @Inject(forwardRef(() => UserPrivilegeService))
    private readonly userPrivilegeService: UserPrivilegeService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly pushGateway: PushGateway,
    private readonly backgroundTaskProgressService: BackgroundTaskProgressService
  ) {
    this.auditService.registerObjectTypeQueryHandler(AuditLogObjectType.Contest, async (contestId, locale) => {
      const contest = await this.findContestById(contestId);
      return !contest ? null : await this.getContestMeta(contest, locale);
    });

    this.contestAnnouncementPushService = this.pushGateway.registerPushType("ContestAnnouncement", {
      getInitialMessageForSubscription: async subscription => {
        const contestAnnouncements = await this.contestAnnouncementRepository.find({
          contestId: subscription.contestId,
          id: MoreThan(subscription.latestAnnouncementId)
        });
        return Object.fromEntries((await this.getContestAnnouncementDtos(contestAnnouncements)).map(announcement => [announcement.id, announcement]));
      },
      getRoomForSubscription: subscription => {
        return `${subscription.contestId}`;
      }
    });

    this.contestIssuePushService = this.pushGateway.registerPushType("ContestIssue", {
      getInitialMessageForSubscription: async subscription => {
        const contestIssues = await this.contestIssueRepository.find(
          subscription.userId
            ? {
                contestId: subscription.contestId,
                submitterId: subscription.userId,
                replyTime: MoreThan(new Date(subscription.latestTime))
              }
            : {
                contestId: subscription.contestId,
                submitTime: MoreThan(new Date(subscription.latestTime))
              }
        );
        return Object.fromEntries((await this.getContestIssueDtos(contestIssues)).map(issue => [issue.id, issue]));
      },
      getRoomForSubscription: subscription => {
        return subscription.userId ? `${subscription.contestId}:${subscription.userId}` : `${subscription.contestId}`;
      }
    });
  }

  async findContestById(id: number): Promise<ContestEntity> {
    return id && (await this.contestRepository.findOne(id));
  }

  async findContestIssueById(id: number): Promise<ContestIssueEntity> {
    return id && (await this.contestIssueRepository.findOne(id));
  }

  async findContestAnnouncementById(id: number): Promise<ContestAnnouncementEntity> {
    return id && (await this.contestAnnouncementRepository.findOne(id));
  }

  async findContestsByExistingIds(contestIds: number[]): Promise<ContestEntity[]> {
    if (contestIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(contestIds));
    const records = await this.contestRepository.findByIds(uniqueIds);
    const map = Object.fromEntries(records.map(record => [record.id, record]));
    return contestIds.map(contestId => map[contestId]);
  }

  async getContestMeta(contestId: number): Promise<ContestMetaDto>;
  async getContestMeta(contest: ContestEntity, locale?: Locale): Promise<ContestMetaDto>;
  async getContestMeta(contestOrId: ContestEntity | number, locale?: Locale): Promise<ContestMetaDto> {
    const contestId = typeof contestOrId === "object" ? contestOrId.id : contestOrId;

    const getMetaWithoutName = async () => {
      const cached = JSON.parse(await this.redisService.cacheGet(REDIS_KEY_CONTEST_META.format(contestId)));
      if (cached) return cached;
      else {
        const [contest, contestConfig, contestProblems] = await Promise.all([
          typeof contestOrId === "object" ? contestOrId : this.findContestById(contestOrId),
          this.contestConfigRepository.findOne(contestId),
          this.contestProblemRepository.find({ where: { contestId }, order: { orderId: "ASC" } })
        ]);
        const meta: ContestMetaDto = {
          id: contest.id,
          type: contest.type,
          startTime: contest.startTime,
          endTime: contest.endTime,
          participantDuration: contest.participantDuration,
          publicness: contest.publicness,
          locales: contest.locales,
          problems: contestProblems.map(p => ({ problemId: p.problemId, alias: p.alias})),
          contestOptions: contestConfig.contestOptions,
          contestTypeOptions: contestConfig.contestTypeOptions
        };
        await this.redisService.cacheSet(REDIS_KEY_CONTEST_META.format(contestId), JSON.stringify(meta));
        return meta;
      }
    };

    const getName = async () => {
      if (!locale) return {};

      const contest = contestOrId as ContestEntity;
      const nameLocale = contest.locales.includes(locale) ? locale : contest.locales[0];
      return {
        nameLocale,
        name: await this.localizedContentService.get(contest.id, LocalizedContentType.ContestName, nameLocale)
      };
    };

    const [meta, metaName] = await Promise.all([getMetaWithoutName(), getName()]);
    return { ...meta, ...metaName };
  }

  async getContestAnnouncementsAndSubscription(
    contest: ContestEntity
  ): Promise<[announcements: ContestAnnouncementEntity[], subscription: string]> {
    const announcements = await this.contestAnnouncementRepository.find({
      where: { contestId: contest.id },
      order: { id: "DESC" }
    });
    return [
      announcements,
      this.contestAnnouncementPushService.encodeSubscription({
        contestId: contest.id,
        latestAnnouncementId: announcements[0]?.id || 0
      })
    ];
  }

  async getContestIssuesAndSubscription(
    contest: ContestEntity,
    user?: UserEntity
  ): Promise<[issues: ContestIssueEntity[], subscription: string]> {
    const issues = await this.contestIssueRepository.find({
      where: { contestId: contest.id, ...(user ? { submitterId: user.id } : {}) },
      order: { id: "DESC" }
    });
    return [
      issues,
      this.contestIssuePushService.encodeSubscription({
        contestId: contest.id,
        userId: user?.id,
        latestTime: new Date(Math.max(...issues.map(issue => (user ? +issue.replyTime : +issue.submitTime))) || 0)
      })
    ];
  }

  async getContestAnnouncementDtos(
    contestAnnouncements: ContestAnnouncementEntity[]
  ): Promise<ContestAnnouncementDto[]> {
    const publishers = await this.userService
      .findUsersByExistingIds(contestAnnouncements.map(announcement => announcement.publisherId))
      .then(users => Promise.all(users.map(user => this.userService.getUserMeta(user))))
      .then(users => new Map(users.map(user => [user.id, user])));

    return contestAnnouncements.map((announcement, i) => ({
      id: announcement.id,
      contestId: announcement.contestId,
      publisher: publishers.get(announcement.publisherId),
      publishTime: announcement.publishTime,
      localizedContents: announcement.localizedContents
    }));
  }

  async getContestIssueDtos(contestIssues: ContestIssueEntity[]): Promise<ContestIssueDto[]> {
    const users = await this.userService
      .findUsersByExistingIds(contestIssues.map(issue => [issue.submitterId, issue.replierId]).flat().filter(x => x))
      .then(users => Promise.all(users.map(user => this.userService.getUserMeta(user))))
      .then(users => new Map(users.map(user => [user.id, user])));

    return contestIssues.map(issue => ({
      id: issue.id,
      contestId: issue.contestId,
      submitter: users.get(issue.submitterId),
      submitTime: issue.submitTime,
      issueContent: issue.issueContent,
      replier: users.get(issue.replierId),
      replyTime: issue.replyTime,
      replyContent: issue.replyContent
    }));
  }

  async getContestProblem(contest: ContestEntity, alias: string): Promise<ContestProblemEntity> {
    return await this.contestProblemRepository.findOne({
      contestId: contest.id,
      alias
    });
  }

  async findParticipant(contest: ContestEntity, user: UserEntity): Promise<ContestParticipantEntity> {
    return await this.contestParticipantRepository.findOne({
      contestId: contest.id,
      userId: user.id
    });
  }

  async isProblemUsedInContest(problem: ProblemEntity, contest?: ContestEntity): Promise<boolean> {
    return (
      (await this.contestProblemRepository.count({
        where: contest ? { problemId: problem.id, contestId: contest.id } : { problemId: problem.id },
        take: 1
      })) != 0
    );
  }

  async getContestParticipantCount(contests: ContestEntity[]): Promise<Record<number, number>> {
    const queryResult = await this.contestParticipantRepository
      .createQueryBuilder()
      .select("COUNT(*)", "count")
      .addSelect("contestId")
      .where("contestId IN (:...ids)", { ids: contests.map(c => c.id) })
      .groupBy("contestId")
      .getRawMany<{ contestId: number, count: number }>();
    return Object.fromEntries(queryResult.map(({ contestId, count }) => [contestId, Number(count)]));
  }

  async filterParticipatedContests(contests: ContestEntity[], user: UserEntity): Promise<number[]> {
    const queryResult = await this.contestParticipantRepository
      .createQueryBuilder()
      .addSelect("contestId")
      .where("contestId IN (:...ids)", { ids: contests.map(c => c.id) })
      .andWhere("userId = :userId", { userId: user.id })
      .groupBy("contestId")
      .getRawMany<{ contestId: number }>();
    return queryResult.map(r => r.contestId);
  }

  async userHasPermission(
    user: UserEntity,
    contest: ContestEntity,
    type: ContestPermissionType,
    hasPrivilege?: boolean
  ): Promise<boolean> {
    switch (type) {
      // Participants can view the contest
      // Everyone can view a PublicViewAfterEnded contest (only after ended)
      // Who has view permission can view a non-public contest (only after ended)
      // Admins can view any contest at any time
      case ContestPermissionType.View:
        if (await this.isRegistered(contest, user)) return true;
        if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageContest)))
          return true;
        if (
          contest.publicness !== ContestPublicness.Hidden ||
          (await this.permissionService.userOrItsGroupsHavePermission(
            user,
            contest.id,
            PermissionObjectType.Contest,
            ContestPermissionLevel.View
          ))
        )
          return (
            this.isEnded(contest) ||
            (await this.permissionService.userOrItsGroupsHavePermission(
              user,
              contest.id,
              PermissionObjectType.Contest,
              ContestPermissionLevel.Inspect
            ))
          );

      // Everyone can participate a PublicParticipation contest
      // Who has participate permission can participate a non-public contest
      // Admins can participate any contest
      case ContestPermissionType.Participate:
        if (contest.publicness === ContestPublicness.PublicParticipation) return true;
        if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageContest)))
          return true;
        if (
          await this.permissionService.userOrItsGroupsHavePermission(
            user,
            contest.id,
            PermissionObjectType.Contest,
            ContestPermissionLevel.Participate
          )
        )
          return true;

      // Who has inspect permission can inspect a contest
      // Admins can inspect any contest
      case ContestPermissionType.Inspect:
        if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageContest)))
          return true;
        else
          return await this.permissionService.userOrItsGroupsHavePermission(
            user,
            contest.id,
            PermissionObjectType.Contest,
            ContestPermissionLevel.Inspect
          );

      // Who has modify permission can modify a contest
      // Admins can modify any contest
      case ContestPermissionType.Modify:
        if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageContest)))
          return true;
        else
          return await this.permissionService.userOrItsGroupsHavePermission(
            user,
            contest.id,
            PermissionObjectType.Contest,
            ContestPermissionLevel.Modify
          );
    }
  }

  async getUserPermissions(user: UserEntity, contest: ContestEntity): Promise<ContestPermissionType[]> {
    if (!user)
      return contest.publicness !== ContestPublicness.Hidden && this.isEnded(contest)
        ? [ContestPermissionType.View]
        : [];

    if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageContest))
      return Object.values(ContestPermissionType);

    const result: ContestPermissionType[] = [];
    if (await this.isRegistered(contest, user)) {
      result.push(ContestPermissionType.View);
    }

    const permissionLevel = await this.permissionService.getUserOrItsGroupsMaxPermissionLevel<ContestPermissionLevel>(
      user,
      contest.id,
      PermissionObjectType.Contest
    );
    if (
      ((contest.publicness !== ContestPublicness.Hidden || permissionLevel >= ContestPermissionLevel.View) &&
        this.isEnded(contest)) ||
      permissionLevel >= ContestPermissionLevel.Inspect
    )
      result.push(ContestPermissionType.View);
    if (
      contest.publicness === ContestPublicness.PublicParticipation ||
      permissionLevel >= ContestPermissionLevel.Participate
    )
      result.push(ContestPermissionType.Participate);
    if (permissionLevel >= ContestPermissionLevel.Inspect) result.push(ContestPermissionType.Inspect);
    if (permissionLevel >= ContestPermissionLevel.Modify) result.push(ContestPermissionType.Modify);
    return result;
  }

  async getUserRoleInContest(user: UserEntity, contest: ContestEntity): Promise<ContestUserRole> {
    if (!user) return null;
    if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageContest)) return ContestUserRole.Admin;

    const permissionLevel = await this.permissionService.getUserOrItsGroupsMaxPermissionLevel<ContestPermissionLevel>(
      user,
      contest.id,
      PermissionObjectType.Contest
    );
    if (permissionLevel >= ContestPermissionLevel.Modify) return ContestUserRole.Admin;
    if (permissionLevel >= ContestPermissionLevel.Inspect) return ContestUserRole.Inspector;

    if (await this.isRegistered(contest, user)) return ContestUserRole.Participant;

    return null;
  }

  /**
   * Lock a contest by ID with Read/Write Lock.
   * @param type `"Read"` to ensure the contest exists while holding the lock, `"Write"` is for deleting the contest.
   */
  async lockContestById<T>(
    id: number,
    type: "Read" | "Write",
    callback: (contest: ContestEntity) => Promise<T>
  ): Promise<T>;

  /**
   * Lock a contest by ID with Read/Write Lock.
   * @param type `"Read"` to ensure the contest exists while holding the lock, `"Write"` is for deleting the contest.
   */
  async lockContestById(
    id: number,
    type: "Read" | "Write"
  ): Promise<[contest: ContestEntity, unlock: () => Promise<void>]>;

  async lockContestById<T>(
    id: number,
    type: "Read" | "Write",
    callback?: (contest: ContestEntity) => Promise<T>
  ): Promise<T | [contest: ContestEntity, unlock: () => Promise<void>]> {
    const lockName = `AcquireContest_${id}`;
    if (callback)
      return await this.lockService.lockReadWrite(
        lockName,
        type,
        async () => await callback(await this.findContestById(id))
      );
    else {
      const unlock = await this.lockService.lockReadWrite(lockName, type);
      try {
        return [await this.findContestById(id), unlock];
      } finally {
        await unlock();
      }
    }
  }

  async getContestAllLocalizedContents(contest: ContestEntity) {
    return await Promise.all(contest.locales.map(async locale => ({
      name: await this.localizedContentService.get(contest.id, LocalizedContentType.ContestName, locale),
      description: await this.localizedContentService.get(contest.id, LocalizedContentType.ContestDescription, locale),
      locale
    })));
  }

  async getContestLocalizedDescription(contest: ContestEntity, locale: Locale): Promise<string> {
    return await this.localizedContentService.get(contest.id, LocalizedContentType.ContestDescription, locale);
  }

  private async lockProblemsForEditingContest<T>(
    contestInformation: ContestInformationDto,
    callback: (problems: { problem: ProblemEntity; alias: string }[]) => Promise<T>
  ): Promise<T> {
    const unlockProblems: Array<() => Promise<void>> = [];
    try {
      const problems: { problem: ProblemEntity; alias: string }[] = [];
      for (const { problemId, alias } of contestInformation.problems) {
        const [problem, unlock] = await this.problemService.lockProblemById(problemId, "Read");
        problems.push({ problem, alias});
        unlockProblems.push(unlock);
      }

      return await callback(problems);
    } finally {
      await Promise.all(unlockProblems.map(f => f()));
    }
  }

  /**
   * @return `ContestEntity` or error.
   */
  async createContest(contestInformation: ContestInformationDto): Promise<ContestEntity | "INVALID_CONTEST_TYPE_OPTIONS" | "NO_SUCH_PROBLEM"> {
    if (
      !this.contestTypeFactoryService
        .type(contestInformation.type)
        .validateConfig(contestInformation.contestTypeOptions, contestInformation.problems.map(p => p.problemId))
    )
      return "INVALID_CONTEST_TYPE_OPTIONS";

    return await this.lockProblemsForEditingContest(contestInformation, async problems => {
      if (problems.some(p => !p)) return "NO_SUCH_PROBLEM";

      return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        const contest = new ContestEntity();
        contest.type = contestInformation.type;
        contest.startTime = new Date(contestInformation.startTime);
        contest.endTime = new Date(contestInformation.endTime);
        contest.participantDuration = contestInformation.participantDuration;
        contest.publicness = contestInformation.publicness;
        contest.locales = contestInformation.localizedContents.map(c => c.locale);
        await transactionalEntityManager.save(contest);

        const contestConfig = new ContestConfigEntity();
        contestConfig.contestId = contest.id;
        contestConfig.contestOptions = contestInformation.contestOptions;
        contestConfig.contestTypeOptions = contestInformation.contestTypeOptions;
        await transactionalEntityManager.save(contestConfig);

        await Promise.all(
          problems.map(async ({ problem, alias }, i) => {
            const contestProblem = new ContestProblemEntity();
            contestProblem.contestId = contest.id;
            contestProblem.problemId = problem.id;
            contestProblem.orderId = i;
            contestProblem.alias = alias;
            await transactionalEntityManager.save(contestProblem);
          })
        );

        await Promise.all(
          contestInformation.localizedContents.map(async localizedContent => {
            await this.localizedContentService.createOrUpdate(
              contest.id,
              LocalizedContentType.ContestName,
              localizedContent.locale,
              localizedContent.name,
              transactionalEntityManager
            );
            await this.localizedContentService.createOrUpdate(
              contest.id,
              LocalizedContentType.ContestDescription,
              localizedContent.locale,
              localizedContent.description,
              transactionalEntityManager
            );
          })
        );

        return contest;
      });
    });
  }

  /**
   * @param contest Must be locked by `ContestService.lockContestById(id, "Write")`.
   * @return `null` or error.
   */
  async updateContest(
    contest: ContestEntity,
    contestInformation: ContestInformationDto
  ): Promise<
    "NO_SUCH_PROBLEM" | "INVALID_CONTEST_TYPE_OPTIONS" | "SUBMITTED_EARLIER_THAN_NEW_START_TIME" | "DELETING_PROBLEM_SUMITTED"
  > {
    if (
      !this.contestTypeFactoryService
        .type(contest.type)
        .validateConfig(contestInformation.contestTypeOptions, contestInformation.problems.map(p => p.problemId))
    )
      return "INVALID_CONTEST_TYPE_OPTIONS";

    // Check if the contest has submissions
    const submission = await this.submissionService.getEarlistSubmissionOfContest(contest.id);
    if (submission && submission.submitTime < new Date(contestInformation.startTime)) return "SUBMITTED_EARLIER_THAN_NEW_START_TIME";

    // Check if any being deleted problems have been submitted
    const contestProblems = await this.contestProblemRepository.find({ contestId: contest.id });
    for (const { problemId } of contestProblems) {
      // eslint-disable-next-line no-await-in-loop
      if (
        !contestInformation.problems.some(p => p.problemId === problemId) &&
        (await this.submissionService.problemHasAnySubmission(problemId, contest.id))
      )
        return "DELETING_PROBLEM_SUMITTED";
    }

    const result = await this.lockProblemsForEditingContest(contestInformation, async problems => {
      if (problems.some(p => !p)) return "NO_SUCH_PROBLEM";

      return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        const newLocales = contestInformation.localizedContents.map(c => c.locale);
        const deletingLocales = contest.locales.filter(locale => !newLocales.includes(locale));

        contest.startTime = new Date(contestInformation.startTime);
        contest.endTime = new Date(contestInformation.endTime);
        contest.participantDuration = contestInformation.participantDuration;
        contest.publicness = contestInformation.publicness;
        contest.locales = newLocales;
        await transactionalEntityManager.save(contest);

        const contestConfig = await this.contestConfigRepository.findOne({ contestId: contest.id });
        contestConfig.contestId = contest.id;
        contestConfig.contestOptions = contestInformation.contestOptions;
        contestConfig.contestTypeOptions = contestInformation.contestTypeOptions;

        await transactionalEntityManager.save(contestConfig);

        await transactionalEntityManager.delete(ContestProblemEntity, { contestId: contest.id });
        await Promise.all(
          problems.map(async ({ problem, alias }, i) => {
            const contestProblem = new ContestProblemEntity();
            contestProblem.contestId = contest.id;
            contestProblem.problemId = problem.id;
            contestProblem.orderId = i;
            contestProblem.alias = alias;
            await transactionalEntityManager.save(contestProblem);
          })
        );

        await Promise.all(
          deletingLocales.map(async locale => {
            await this.localizedContentService.delete(
              contest.id,
              LocalizedContentType.ContestName,
              locale,
              transactionalEntityManager
            );
            await this.localizedContentService.delete(
              contest.id,
              LocalizedContentType.ContestDescription,
              locale,
              transactionalEntityManager
            );
          })
        );

        await Promise.all(
          contestInformation.localizedContents.map(async localizedContent => {
            await this.localizedContentService.createOrUpdate(
              contest.id,
              LocalizedContentType.ContestName,
              localizedContent.locale,
              localizedContent.name,
              transactionalEntityManager
            );
            await this.localizedContentService.createOrUpdate(
              contest.id,
              LocalizedContentType.ContestDescription,
              localizedContent.locale,
              localizedContent.description,
              transactionalEntityManager
            );
          })
        );

        return null;
      });
    });

    if (!result) {
      await this.redisService.cacheDelete(REDIS_KEY_CONTEST_META.format(contest.id));
    }

    return result;
  }

  /**
   * @param contest Must be locked by `ContestService.lockContestById(id, "Write")`.
   * @return `null` or error.
   */
  async deleteContest(contest: ContestEntity) {
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      await Promise.all(
        contest.locales.map(async locale => {
          await this.localizedContentService.delete(
            contest.id,
            LocalizedContentType.ContestName,
            locale,
            transactionalEntityManager
          );
          await this.localizedContentService.delete(
            contest.id,
            LocalizedContentType.ContestDescription,
            locale,
            transactionalEntityManager
          );
        })
      );

      await transactionalEntityManager.remove(contest); // CASCADE
    });
  }

  async getContestOptions(contestOrId: ContestEntity | number): Promise<ContestOptions> {
    return (await this.getContestMeta(typeof contestOrId === "number" ? contestOrId : contestOrId.id)).contestOptions;
  }

  async getContestTypeOptions<ContestTypeOptions = unknown>(contestOrId: ContestEntity | number): Promise<ContestTypeOptions> {
    return (await this.getContestMeta(typeof contestOrId === "number" ? contestOrId : contestOrId.id)).contestTypeOptions as ContestTypeOptions;
  }

  async setContestAccessControlList(
    contest: ContestEntity,
    accessControlList: AccessControlList<ContestPermissionLevel>
  ): Promise<void> {
    await this.lockContestById(
      contest.id,
      "Read",
      // eslint-disable-next-line @typescript-eslint/no-shadow
      async contest =>
        await this.permissionService.setAccessControlList(contest.id, PermissionObjectType.Contest, accessControlList)
    );
  }

  async getContestAccessControlListWithSubjectId(
    contest: ContestEntity
  ): Promise<AccessControlList<ContestPermissionLevel>> {
    return await this.permissionService.getAccessControlList<ContestPermissionLevel>(
      contest.id,
      PermissionObjectType.Contest
    );
  }

  async getContestAccessControlListWithSubjectMeta(
    contest: ContestEntity,
    currentUser: UserEntity
  ): Promise<AccessControlListWithSubjectMeta<ContestPermissionLevel>> {
    return await this.permissionService.getAccessControlListWithSubjectMeta<ContestPermissionLevel>(
      contest.id,
      PermissionObjectType.Contest,
      currentUser
    );
  }

  async createContestAnnouncement(
    contest: ContestEntity,
    publisher: UserEntity,
    localizedContents: ContestAnnouncementLocalizedContentDto[]
  ): Promise<ContestAnnouncementEntity> {
    const contestAnnouncement = new ContestAnnouncementEntity();
    contestAnnouncement.contestId = contest.id;
    contestAnnouncement.publisherId = publisher.id;
    contestAnnouncement.publishTime = new Date();
    contestAnnouncement.localizedContents = localizedContents;
    await this.contestAnnouncementRepository.save(contestAnnouncement);

    this.contestAnnouncementPushService.push(`${contest.id}`, {
      [contestAnnouncement.id]: {
        id: contestAnnouncement.id,
        contestId: contestAnnouncement.contestId,
        publisher: await this.userService.getUserMeta(publisher),
        publishTime: contestAnnouncement.publishTime,
        localizedContents: contestAnnouncement.localizedContents
      }
    });

    return contestAnnouncement;
  }

  async deleteContestAnnouncement(contestAnnouncement: ContestAnnouncementEntity): Promise<void> {
    const {id, contestId} = contestAnnouncement;
    await this.contestAnnouncementRepository.remove(contestAnnouncement);

    this.contestAnnouncementPushService.push(`${contestId}`, {
      [id]: null
    });
  }

  async createContestIssue(
    contest: ContestEntity,
    submitter: UserEntity,
    content: string
  ): Promise<ContestIssueEntity> {
    const contestIssue = new ContestIssueEntity();
    contestIssue.contestId = contest.id;
    contestIssue.submitterId = submitter.id;
    contestIssue.submitTime = new Date();
    contestIssue.issueContent = content;
    contestIssue.replierId = null;
    contestIssue.replyTime = null;
    contestIssue.replyContent = null;
    await this.contestIssueRepository.save(contestIssue);

    // Push for inspectors
    this.contestIssuePushService.push(`${contest.id}`, {
      [contestIssue.id]: {
        id: contestIssue.id,
        contestId: contestIssue.contestId,
        submitter: await this.userService.getUserMeta(submitter),
        submitTime: contestIssue.submitTime,
        issueContent: contestIssue.issueContent,
        replier: null,
        replyTime: null,
        replyContent: null
      }
    });

    return contestIssue;
  }

  async deleteContestIssue(contestIssue: ContestIssueEntity): Promise<void> {
    const {id, contestId, submitterId} = contestIssue;
    await this.contestIssueRepository.remove(contestIssue);

    const message: Record<number, ContestIssueDto> = { [id]: null };

    // Push for participants
    this.contestIssuePushService.push(`${contestId}:${submitterId}`, message);
    // Push for inspectors
    this.contestIssuePushService.push(`${contestId}`, message);
  }

  async replyContestIssue(contestIssue: ContestIssueEntity, replier: UserEntity, content: string): Promise<void> {
    contestIssue.replierId = replier.id;
    contestIssue.replyTime = new Date();
    contestIssue.replyContent = content;
    await this.contestIssueRepository.save(contestIssue);

    const message: Record<number, ContestIssueDto> = {
      [contestIssue.id]: {
        id: contestIssue.id,
        contestId: contestIssue.contestId,
        submitter: await this.userService.getUserMeta(await this.userService.findUserById(contestIssue.submitterId)),
        submitTime: contestIssue.submitTime,
        issueContent: contestIssue.issueContent,
        replier: await this.userService.getUserMeta(replier),
        replyTime: contestIssue.replyTime,
        replyContent: contestIssue.replyContent
      }
    };

    // Push for participants
    this.contestIssuePushService.push(`${contestIssue.contestId}:${contestIssue.submitterId}`, message);
    // Push for inspectors
    this.contestIssuePushService.push(`${contestIssue.contestId}`, message);
  }

  async getProblemStatisticsInContest(
    contestId: number,
    problemId: number,
    isReal: boolean
  ): Promise<{ submitted: number; accepted: number }> {
    const [submitted, accepted] = await Promise.all([
      this.contestParticipantProblemStatisticsRepository.count({ contestId, problemId, isReal, submitted: true }),
      this.contestParticipantProblemStatisticsRepository.count({ contestId, problemId, isReal, accepted: true })
    ]);
    return { submitted, accepted };
  }

  /**
   * @param contest Must be locked by `ContestService.lockContestById(id, "Write")`.
   * @return Subscription key when success. `false` when a rejudge is already running.
   */
  async startRejudge(contest: ContestEntity, problemId?: number): Promise<false | string> {
    if (await this.backgroundTaskProgressService.isTaskRunning(BACKGROUND_TASK_CONTEST_REJUDGE.format(contest.id)))
      return false;

    return this.backgroundTaskProgressService.startBackgroundTask(
      BACKGROUND_TASK_CONTEST_REJUDGE.format(contest.id),
      async emitProgress => {
        doGroupedBatchOperation(
          await this.submissionService.getSubmissionsOfContest(contest.id, problemId),
          async submission => await this.submissionService.rejudgeSubmission(submission),
          20
        );
      }
    );
  }

  getRejudgeProgressSubscriptionKey(contest: ContestEntity): string {
    return this.backgroundTaskProgressService.encodeSubscription(BACKGROUND_TASK_CONTEST_REJUDGE.format(contest.id));
  }

  async userRegisterContest(user: UserEntity, contest: ContestEntity, now: Date) {
    const participant = new ContestParticipantEntity();
    participant.contestId = contest.id;
    participant.userId = user.id;
    if (contest.participantDuration != null) participant.startTime = now;
    participant.scoreReal = 0;
    participant.detailReal = { latestSubmissionId: null, usedSubmissionIdForProblem: {}, info: null, score: 0 };
    participant.scoreVisibleDuringContest = 0;
    participant.detailVisibleDuringContest = {
      latestSubmissionId: null,
      usedSubmissionIdForProblem: {},
      info: null,
      score: 0
    };

    try {
      await this.contestParticipantRepository.save(participant);
      return true;
    } catch (e) {
      if (await this.isRegistered(contest, user)) return false;
      throw e;
    }
  }

  async queryContests(
    publicOnly: boolean,
    skipCount: number,
    takeCount: number
  ): Promise<[contests: ContestEntity[], count: number]> {
    return await this.contestRepository.findAndCount({
      where: publicOnly ? { publicness: Not(ContestPublicness.Hidden) } : {},
      order: { startTime: "DESC", endTime: "DESC" },
      skip: skipCount,
      take: takeCount
    });
  }

  async queryRanklist(
    contest: ContestEntity,
    sortByRealScore: boolean,
    skipCount: number,
    takeCount: number
  ): Promise<[result: ContestParticipantEntity[], count: number, firstRank: number]> {
    const scoreColumn = sortByRealScore ? "scoreReal" : "scoreVisibleDuringContest";
    const [result, count] = await this.contestParticipantRepository.findAndCount({
      where: {
        contestId: contest.id
      },
      order: {
        [scoreColumn]: "DESC"
      },
      skip: skipCount,
      take: takeCount
    });

    const firstRank =
      result.length > 0 &&
      1 +
        (await this.contestParticipantRepository.count({
          contestId: contest.id,
          [scoreColumn]: MoreThan(result[0][scoreColumn])
        }));

    return [result, count, firstRank];
  }

  async isRegistered(contest: ContestEntity, user: UserEntity) {
    return (await this.contestParticipantRepository.count({ contestId: contest.id, userId: user.id })) !== 0;
  }

  isStarted(contest: ContestEntity, now?: Date) {
    if (!now) now = new Date();

    return now > contest.startTime;
  }

  isEnded(contest: ContestEntity, now?: Date) {
    if (!now) now = new Date();

    return now > contest.endTime;
  }

  async isEndedFor(contest: ContestEntity, user: UserEntity, now?: Date) {
    if (!now) now = new Date();

    if (this.isEnded(contest, now)) return true;
    if (!user) return false;

    const participant = await this.contestParticipantRepository.findOne({ contestId: contest.id, userId: user.id });
    const endTime = moment(participant.startTime).add(contest.participantDuration, "s").toDate();
    return now > endTime;
  }

  async onSubmissionUpdated(
    oldSubmission: SubmissionEntity,
    submission: SubmissionEntity,
    resultUpdated: { pretests: boolean; full: boolean }
  ): Promise<void> {
    const submissionId = oldSubmission?.id || submission?.id;
    const contestId = oldSubmission?.contestId || submission?.contestId;
    const problemId = oldSubmission?.problemId || submission?.problemId;
    const submitterId = oldSubmission?.submitterId || submission?.submitterId;

    const contest = await this.findContestById(contestId);
    const contestMeta = await this.getContestMeta(contest);
    const { contestOptions, contestTypeOptions } = contestMeta;

    const isAcceptedReal = (submission: SubmissionEntity) => submission?.status === SubmissionStatus.Accepted;
    const isAcceptedDuringContest = (submission: SubmissionEntity) => {
      if (contestOptions.ranklistDuringContest === "Real") return isAcceptedReal(submission);
      else if (contestOptions.ranklistDuringContest === "Pretests")
        return submission?.pretestsStatus === SubmissionStatus.Accepted;
    };

    // If this submission is submitted after ranklist freezed, or the ranlist is not visible
    const freezeRanklistTime =
      contestOptions.freezeRanklistForParticipantsWhen &&
      moment(contest.startTime).add(contestOptions.freezeRanklistForParticipantsWhen, "s").toDate();
    const skipUpdateForRanklistDuringContest =
      contestOptions.ranklistDuringContest === "None" ||
      (contestOptions.ranklistDuringContest === "Pretests" && !resultUpdated.pretests) ||
      (contestOptions.freezeRanklistForParticipantsWhen &&
        (oldSubmission?.submitTime || submission?.submitTime) > freezeRanklistTime);
    const skipUpdateForRanklistReal = !resultUpdated.full;

    const oldAcceptedReal = isAcceptedReal(oldSubmission);
    const newAcceptedReal = isAcceptedReal(submission);
    const oldAcceptedDuringContest = isAcceptedDuringContest(oldSubmission);
    const newAcceptedDuringContest = isAcceptedDuringContest(submission);

    const updateFirstAcceptedForRanklistDuringContest =
      !skipUpdateForRanklistDuringContest && oldAcceptedDuringContest !== newAcceptedDuringContest;
    const updateFirstAcceptedForRanklistReal = !skipUpdateForRanklistReal && oldAcceptedReal !== newAcceptedReal;

    // Maintain the first AC submission ID
    if (updateFirstAcceptedForRanklistDuringContest || updateFirstAcceptedForRanklistReal)
      await this.lockService.lock(
        `update-contest-problem-first-accepted-submission:${contestId}:${problemId}`,
        async () => {
          const contestProblem = await this.contestProblemRepository.findOne({ contestId, problemId });

          const updateFirstAccepted = async (isReal: boolean) => {
            const firstAcceptedSubmissionIdKey = isReal
              ? "firstAcceptedSubmissionIdReal"
              : "updateFirstAcceptedForRanklistDuringContest";
            const newAccepted = isReal ? newAcceptedReal : newAcceptedDuringContest;

            if (newAccepted) {
              if (
                !contestProblem[firstAcceptedSubmissionIdKey] ||
                contestProblem[firstAcceptedSubmissionIdKey] > submissionId
              ) {
                contestProblem[firstAcceptedSubmissionIdKey] = submissionId;
                return true;
              }
            } else {
              if (contestProblem[firstAcceptedSubmissionIdKey] === submissionId) {
                // First AC submission got rejudged to non-AC
                // Query the database for the new first AC submission
                const qb = this.connection
                  .createQueryBuilder()
                  .select("MIN(id)", "minId")
                  .from(SubmissionEntity, "submission")
                  .where({
                    contestId,
                    problemId,
                    [isReal || contestOptions.ranklistDuringContest === "Real"
                      ? "status"
                      : "pretestsStatus"]: SubmissionStatus.Accepted
                  });

                if (!isReal && freezeRanklistTime)
                  qb.andWhere("submitTime <= :freezeRanklistTime", { freezeRanklistTime });

                contestProblem[firstAcceptedSubmissionIdKey] = (await qb.getRawOne<{ minId: number }>())?.minId;
                return true;
              }
            }
          };

          if (
            (
              await Promise.all([
                updateFirstAcceptedForRanklistReal && updateFirstAccepted(true),
                updateFirstAcceptedForRanklistDuringContest && updateFirstAccepted(false)
              ])
            ).some(x => x)
          ) {
            await this.contestProblemRepository.save(contestProblem);
          }
        }
      );

    // Maintain the participant detail
    await this.lockService.lock(`update-contest-participant-detail:${contestId}:${submitterId}`, async () => {
      const participant = await this.contestParticipantRepository.findOne({ contestId, userId: submissionId });

      const updateParticipantDetail = async (isReal: boolean) => {
        const detail = isReal ? participant.detailReal : participant.detailVisibleDuringContest;
        const getAllSubmissions = () =>
          this.submissionService.getUserContestSubmissions(submitterId, contestId, isReal ? null : freezeRanklistTime);
        const progressVisibility =
          isReal || contestOptions.ranklistDuringContest === "Real" ? null : SubmissionProgressVisibility.PretestsOnly;

        // Return modified or not
        const processSubmission = async (
          submission: SubmissionEntity
        ): Promise<[detailModified: boolean, statistics?: { submitted?: boolean; accepted?: boolean }]> => {
          if (!submission) return [false];

          const meta = await this.submissionService.getSubmissionBasicMeta(submission, progressVisibility);
          if (invalidSubmissionStatus.has(meta.status)) return [false];
          await this.contestTypeFactoryService
            .type(contest.type)
            .onSubmissionUpdated(
              problemId,
              submitterId,
              contest.participantDuration ? participant.startTime : contest.startTime,
              meta,
              detail,
              contestTypeOptions
            );
          detail.latestSubmissionId = submission.id;

          participant[isReal ? "scoreReal" : "scoreVisibleDuringContest"] = detail.score || 0;

          return [true, { submitted: true, accepted: meta.status === SubmissionStatus.Accepted }];
        };

        // If rejudged a earlier submission, rebuild the detail
        if (submissionId <= detail.latestSubmissionId) {
          detail.latestSubmissionId = 0;
          detail.info = null;
          detail.score = 0;

          // Replay all submissions
          const submissions = await getAllSubmissions();

          return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
            // Also rebuild the participant's problem statistics info
            await transactionalEntityManager.delete(ContestParticipantProblemStatisticsEntity, {
              contestId,
              userId: submitterId,
              isReal
            });

            const statisticsByProblem = new Map(
              contestMeta.problems.map(({ problemId }) => [problemId, { submitted: false, accepted: false }])
            );

            let detailModified = false;
            for (const submission of submissions) {
              const [modified, statistics] = await processSubmission(submission);

              const problemStatistics = statisticsByProblem.get(submission.problemId);
              problemStatistics.submitted ||= !!statistics?.submitted;
              problemStatistics.accepted ||= !!statistics?.accepted;

              if (modified) detailModified = true;
            }

            // Save the participant's problem statistics info
            for (const [problemId, statistics] of statisticsByProblem.entries()) {
              if (statistics.submitted || statistics.accepted) {
                const statisticsEntity = new ContestParticipantProblemStatisticsEntity();
                statisticsEntity.contestId = contestId;
                statisticsEntity.userId = submitterId;
                statisticsEntity.problemId = problemId;
                statisticsEntity.isReal = isReal;
                statisticsEntity.submitted = statistics.submitted;
                statisticsEntity.accepted = statistics.accepted;
                await transactionalEntityManager.save(statisticsEntity);
              }
            }

            return detailModified;
          });
        } else {
          const [modified, statistics] = await processSubmission(submission);

          // Update the participant's problem statistics info
          if (statistics?.submitted || statistics?.accepted) {
            let statisticsEntity = await this.contestParticipantProblemStatisticsRepository.findOne({
              contestId,
              problemId,
              userId: submitterId,
              isReal
            });
            if (!statisticsEntity) {
              statisticsEntity = new ContestParticipantProblemStatisticsEntity();
              statisticsEntity.contestId = contestId;
              statisticsEntity.userId = submitterId;
              statisticsEntity.problemId = problemId;
              statisticsEntity.isReal = isReal;
            }

            if (
              statisticsEntity.submitted !== !!statistics.submitted ||
              statisticsEntity.accepted !== !!statistics.accepted
            ) {
              statisticsEntity.submitted ||= !!statistics?.submitted;
              statisticsEntity.accepted ||= !!statistics?.accepted;
              await this.contestParticipantProblemStatisticsRepository.save(statisticsEntity);
            }
          }

          return modified;
        }
      };

      if (
        (
          await Promise.all([
            !skipUpdateForRanklistReal && updateParticipantDetail(true),
            !skipUpdateForRanklistDuringContest && updateParticipantDetail(false)
          ])
        ).some(x => x)
      )
        await this.contestParticipantRepository.save(participant);
    });
  }
}
