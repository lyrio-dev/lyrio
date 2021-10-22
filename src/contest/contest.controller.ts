import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuditLogObjectType, AuditService } from "@/audit/audit.service";
import { ProblemService } from "@/problem/problem.service";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { UserService } from "@/user/user.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { PermissionService } from "@/permission/permission.service";
import { ConfigService } from "@/config/config.service";

import { ContestService, ContestPermissionLevel, ContestPermissionType, ContestUserRole } from "./contest.service";
import { ContestTypeFactoryService } from "./contest-type-factory.service";

import {
  CreateContestRequestDto,
  CreateContestResponseDto,
  CreateContestResponseError,
  DeleteContestRequestDto,
  DeleteContestResponseDto,
  DeleteContestResponseError,
  GetContestAccessControlListRequestDto,
  GetContestAccessControlListResponseDto,
  GetContestAccessControlListResponseError,
  QueryContestsRequestDto,
  QueryContestsResponseDto,
  QueryRanklistRequestDto,
  QueryRanklistResponseDto,
  QueryRanklistResponseError,
  RanklistItemDto,
  RejudgeContestRequestDto,
  RejudgeContestResponseDto,
  RejudgeContestResponseError,
  SetContestAccessControlListRequestDto,
  SetContestAccessControlListResponseDto,
  SetContestAccessControlListResponseError,
  UpdateContestRequestDto,
  UpdateContestResponseDto,
  UpdateContestResponseError,
  RegisterContestRequestDto,
  RegisterContestResponseDto,
  RegisterContestResponseError,
  GetContestRequestDto,
  GetContestResponseDto,
  GetContestResponseError,
  GetContestEditDataRequestDto,
  GetContestEditDataResponseDto,
  GetContestEditDataResponseError,
  CreateContestIssueRequestDto,
  CreateContestIssueResponseDto,
  CreateContestIssueResponseError,
  ReplyContestIssueRequestDto,
  ReplyContestIssueResponseDto,
  ReplyContestIssueResponseError,
  DeleteContestIssueRequestDto,
  DeleteContestIssueResponseDto,
  DeleteContestIssueResponseError,
  CreateContestAnnouncementRequestDto,
  CreateContestAnnouncementResponseDto,
  CreateContestAnnouncementResponseError,
  DeleteContestAnnouncementRequestDto,
  DeleteContestAnnouncementResponseDto,
  DeleteContestAnnouncementResponseError
} from "./dto";

@ApiTags("Contest")
@Controller("contest")
export class ContestController {
  constructor(
    private readonly contestService: ContestService,
    private readonly contestTypeFactoryService: ContestTypeFactoryService,
    private readonly problemService: ProblemService,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {}

  @Post("createContest")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a new contest."
  })
  async createContest(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateContestRequestDto
  ): Promise<CreateContestResponseDto> {
    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageContest)))
      return {
        error: CreateContestResponseError.PERMISSION_DENIED
      };

    const { contestInformation } = request;

    const result = await this.contestService.createContest(contestInformation);

    if (typeof result === "string")
      return {
        error: CreateContestResponseError[result]
      };

    await this.auditService.log("contest.create", AuditLogObjectType.Contest, result.id, {
      contestInformation
    });

    return {
      contestId: result.id
    };
  }

  @Post("updateContest")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update an existing contest's information."
  })
  async updateContest(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateContestRequestDto
  ): Promise<UpdateContestResponseDto> {
    const contest = await this.contestService.findContestById(request.contestId);

    if (!contest)
      return {
        error: UpdateContestResponseError.NO_SUCH_CONTEST
      };

    if (!(await this.contestService.userHasPermission(currentUser, contest, ContestPermissionType.Modify)))
      return {
        error: UpdateContestResponseError.PERMISSION_DENIED
      };

    return await this.contestService.lockContestById(request.contestId, "Write", async contest => {
      if (!contest)
        return {
          error: UpdateContestResponseError.NO_SUCH_CONTEST
        };

      const { contestInformation } = request;

      const result = await this.contestService.updateContest(contest, contestInformation);

      if (typeof result === "string")
        return {
          error: UpdateContestResponseError[result]
        };

      await this.auditService.log("contest.update", AuditLogObjectType.Contest, request.contestId, {
        contestInformation
      });

      return {};
    });
  }

  @Post("deleteContest")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete an existing contest."
  })
  async deleteContest(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteContestRequestDto
  ): Promise<DeleteContestResponseDto> {
    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageContest)))
      return {
        error: DeleteContestResponseError.PERMISSION_DENIED
      };

    return await this.contestService.lockContestById(request.contestId, "Write", async contest => {
      if (!contest)
        return {
          error: DeleteContestResponseError.NO_SUCH_CONTEST
        };

      await this.auditService.log("contest.delete", AuditLogObjectType.Contest, request.contestId, {
        meta: await this.contestService.getContestMeta(request.contestId)
      });

      await this.contestService.deleteContest(contest);

      return {};
    });
  }

  @Post("getContestAccessControlList")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get which users and groups have which permissions of the contest."
  })
  async getContestAccessControlList(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetContestAccessControlListRequestDto
  ): Promise<GetContestAccessControlListResponseDto> {
    const contest = await this.contestService.findContestById(request.id);
    if (!contest)
      return {
        error: GetContestAccessControlListResponseError.NO_SUCH_CONTEST
      };

    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageContest)))
      return {
        error: GetContestAccessControlListResponseError.PERMISSION_DENIED
      };

    return {
      accessControlList: await this.contestService.getContestAccessControlListWithSubjectMeta(contest, currentUser),
      haveManagePermissionsPermission: true
    };
  }

  @Post("setContestAccessControlList")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set who and which groups have permission to read / write this contest."
  })
  async setContestAccessControlList(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetContestAccessControlListRequestDto
  ): Promise<SetContestAccessControlListResponseDto> {
    if (!currentUser)
      return {
        error: SetContestAccessControlListResponseError.PERMISSION_DENIED
      };

    return await this.contestService.lockContestById<SetContestAccessControlListResponseDto>(
      request.contestId,
      "Read",
      async contest => {
        if (!contest)
          return {
            error: SetContestAccessControlListResponseError.NO_SUCH_CONTEST,
            errorObjectId: request.contestId
          };

        if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageContest)))
          return {
            error: SetContestAccessControlListResponseError.PERMISSION_DENIED
          };

        const error = await this.permissionService.validateAccessControlList(
          request.accessControlList,
          ContestPermissionLevel
        );
        if (error) return error;

        const old = await this.contestService.getContestAccessControlListWithSubjectId(contest);

        await this.contestService.setContestAccessControlList(contest, request.accessControlList);

        await this.auditService.log("contest.set_permissions", AuditLogObjectType.Contest, contest.id, {
          old,
          new: request.accessControlList
        });

        return {};
      }
    );
  }

  @Post("registerContest")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Register to participate in a contest."
  })
  async registerContest(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RegisterContestRequestDto
  ): Promise<RegisterContestResponseDto> {
    return await this.contestService.lockContestById(request.contestId, "Read", async contest => {
      if (!contest)
        return {
          error: RegisterContestResponseError.NO_SUCH_CONTEST
        };

      if (!(await this.contestService.userHasPermission(currentUser, contest, ContestPermissionType.Participate)))
        return {
          error: RegisterContestResponseError.PERMISSION_DENIED
        };

      const now = new Date();
      if (this.contestService.isEnded(contest, now))
        return {
          error: RegisterContestResponseError.CONTEST_ENDED
        };

      if (!(await this.contestService.userRegisterContest(currentUser, contest, now)))
        return {
          error: RegisterContestResponseError.ALREADY_REGISTERED
        };

      await this.auditService.log("contest.register", AuditLogObjectType.Contest, request.contestId);

      return {};
    });
  }

  @Post("queryContests")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the list of visible contests."
  })
  async queryContests(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: QueryContestsRequestDto
  ): Promise<QueryContestsResponseDto> {
    if (request.takeCount > this.configService.config.queryLimit.contestList)
      request.takeCount = this.configService.config.queryLimit.contestList;

    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageContest);
    const [contests, count] = await this.contestService.queryContests(
      !hasPrivilege,
      request.skipCount,
      request.takeCount
    );

    const [
      contestMetas,
      participantCount,
      registeredContests
    ] = await Promise.all([
      Promise.all(contests.map(contest => this.contestService.getContestMeta(contest, request.locale))),
      this.contestService.getContestParticipantCount(contests),
      !currentUser ? null : this.contestService.filterParticipatedContests(contests, currentUser)
    ])

    return {
      contests: contestMetas,
      participantCount,
      registeredContests,
      count
    };
  }

  @Post("getContest")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the description, problems, annoucements, issues of a contest."
  })
  async getContest(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetContestRequestDto
  ): Promise<GetContestResponseDto> {
    const contest = await this.contestService.findContestById(request.contestId);
    if (!contest)
      return {
        error: GetContestResponseError.NO_SUCH_CONTEST
      };

    if (!(await this.contestService.userHasPermission(currentUser, contest, ContestPermissionType.View)))
      return {
        error: GetContestResponseError.PERMISSION_DENIED
      };

    const contestMeta = await this.contestService.getContestMeta(contest, request.locale);
    const role = await this.contestService.getUserRoleInContest(currentUser, contest);
    if (role === ContestUserRole.Participant && !(await this.contestService.isEndedFor(contest, currentUser))) {
      const ranklistDuringContest = contestMeta.contestOptions.ranklistDuringContest;
      if (ranklistDuringContest === "None" || request.realRanklist)
        return {
          error: GetContestResponseError.PERMISSION_DENIED
        };
    }

    const descriptionLocale = contest.locales.includes(request.locale) ? request.locale : contest.locales[0];

    const [
      description,
      problems,
      [announcements, announcementsSubscription],
      [issues, issuesSubscription],
      permissions
    ] = await Promise.all([
      this.contestService.getContestLocalizedDescription(contest, descriptionLocale),
      this.problemService
        .findProblemsByExistingIds(contestMeta.problems.map(p => p.problemId))
        .then(problems =>
          Promise.all(
            problems.map(
              async problem =>
                await this.problemService.getProblemMeta(
                  problem,
                  request.locale,
                  await this.contestService.getProblemStatisticsInContest(contest.id, problem.id, request.realRanklist)
                )
            )
          )
        ),
      this.contestService.getContestAnnouncementsAndSubscription(contest),
      // Non-participants normal users will see no issues since they can't publish issue
      !role
        ? null
        : this.contestService.getContestIssuesAndSubscription(contest, role === ContestUserRole.Participant ? currentUser : null),
      this.contestService.getUserPermissions(currentUser, contest)
    ]);

    const [announcementDtos, issueDtos] = await Promise.all([
      this.contestService.getContestAnnouncementDtos(announcements),
      this.contestService.getContestIssueDtos(issues)
    ]);

    return {
      contest: contestMeta,
      description,
      descriptionLocale,
      problems,
      announcements: announcementDtos,
      announcementsSubscription,
      issues: issueDtos,
      issuesSubscription,
      currentUserRole: role,
      permissions
    };
  }

  @Post("getContestEditData")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the meta, problems and localized contents of all locales of a contest."
  })
  async getContestEditData(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetContestEditDataRequestDto
  ): Promise<GetContestEditDataResponseDto> {
    const contest = await this.contestService.findContestById(request.contestId);
    if (!contest)
      return {
        error: GetContestEditDataResponseError.NO_SUCH_CONTEST
      };

    if (!(await this.contestService.userHasPermission(currentUser, contest, ContestPermissionType.Modify)))
      return {
        error: GetContestEditDataResponseError.PERMISSION_DENIED
      };

    const contestMeta = await this.contestService.getContestMeta(contest);

    const [
      localizedContents,
      problems,
    ] = await Promise.all([
      this.contestService.getContestAllLocalizedContents(contest),
      this.problemService
        .findProblemsByExistingIds(contestMeta.problems.map(p => p.problemId))
        .then(problems =>
          Promise.all(
            problems.map(
              async problem =>
                await this.problemService.getProblemMeta(
                  problem,
                  request.locale
                )
            )
          )
        )
    ]);

    return {
      contest: contestMeta,
      localizedContents,
      problems
    };
  }

  @Post("createContestAnnouncement")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create an announcement."
  })
  async createContestAnnouncement(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateContestAnnouncementRequestDto
  ): Promise<CreateContestAnnouncementResponseDto> {
    const contest = await this.contestService.findContestById(request.contestId);
    if (!contest)
      return {
        error: CreateContestAnnouncementResponseError.NO_SUCH_CONTEST
      };

    const role = await this.contestService.getUserRoleInContest(currentUser, contest);
    if (!(role === ContestUserRole.Admin || role === ContestUserRole.Inspector))
      return {
        error: CreateContestAnnouncementResponseError.PERMISSION_DENIED
      };

    if (!this.contestService.isStarted(contest) || this.contestService.isEnded(contest))
      return {
        error: CreateContestAnnouncementResponseError.PERMISSION_DENIED
      };

    const contestAnnouncement = await this.contestService.createContestAnnouncement(contest, currentUser, request.content);

    await this.auditService.log("contest.create_announcement", AuditLogObjectType.Contest, contest.id, {
      id: contestAnnouncement.id,
      publishTime: contestAnnouncement.publishTime,
      content: request.content
    });

    return {
      id: contestAnnouncement.id,
      publishTime: contestAnnouncement.publishTime
    };
  }

  @Post("createContestIssue")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create an issue in a running contest. Only for participants."
  })
  async createContestIssue(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateContestIssueRequestDto
  ): Promise<CreateContestIssueResponseDto> {
    const contest = await this.contestService.findContestById(request.contestId);
    if (!contest)
      return {
        error: CreateContestIssueResponseError.NO_SUCH_CONTEST
      };

    const contestOptions = await this.contestService.getContestOptions(contest);
    if (!contestOptions.enableIssues)
      return {
        error: CreateContestIssueResponseError.PERMISSION_DENIED
      };

    if (!this.contestService.isStarted(contest) || await this.contestService.isEndedFor(contest, currentUser))
      return {
        error: CreateContestIssueResponseError.PERMISSION_DENIED
      };

    if (await this.contestService.getUserRoleInContest(currentUser, contest) !== ContestUserRole.Participant)
      return {
        error: CreateContestIssueResponseError.PERMISSION_DENIED
      };

    const contestIssue = await this.contestService.createContestIssue(contest, currentUser, request.content);

    return {
      id: contestIssue.id,
      submitTime: contestIssue.submitTime
    };
  }

  @Post("replyContestIssue")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Reply an issue in a running contest. Only for admins and inspectors."
  })
  async replyContestIssue(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: ReplyContestIssueRequestDto
  ): Promise<ReplyContestIssueResponseDto> {
    const contestIssue = await this.contestService.findContestIssueById(request.contestIssueId);
    if (!contestIssue)
      return {
        error: ReplyContestIssueResponseError.NO_SUCH_CONTEST_ISSUE
      };

    const contest = await this.contestService.findContestById(contestIssue.contestId);
    const contestOptions = await this.contestService.getContestOptions(contest);
    if (!contestOptions.enableIssues)
      return {
        error: ReplyContestIssueResponseError.PERMISSION_DENIED
      };

    if (!this.contestService.isStarted(contest) || this.contestService.isEnded(contest))
      return {
        error: ReplyContestIssueResponseError.PERMISSION_DENIED
      };

    const role = await this.contestService.getUserRoleInContest(currentUser, contest);
    if (!(role === ContestUserRole.Admin || role === ContestUserRole.Inspector))
      return {
        error: ReplyContestIssueResponseError.PERMISSION_DENIED
      };

    const old = {
      replierId: contestIssue.replierId,
      replyTime: contestIssue.replyTime,
      replyContent: contestIssue.replyContent,
    };

    await this.contestService.replyContestIssue(contestIssue, currentUser, request.content);
    await this.auditService.log("contest.reply_issue", AuditLogObjectType.Contest, contest.id, {
      old
    });

    return {
      replyTime: contestIssue.replyTime
    };
  }

  @Post("deleteContestAnnouncement")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete an announcement in a running contest."
  })
  async deleteContestAnnouncement(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteContestAnnouncementRequestDto
  ): Promise<DeleteContestAnnouncementResponseDto> {
    const contestAnnouncement = await this.contestService.findContestAnnouncementById(request.contestAnnouncementId);
    if (!contestAnnouncement)
      return {
        error: DeleteContestAnnouncementResponseError.NO_SUCH_CONTEST_ISSUE
      };

    const contest = await this.contestService.findContestById(contestAnnouncement.contestId);
    const role = await this.contestService.getUserRoleInContest(currentUser, contest);
    if (!(role === ContestUserRole.Admin || role === ContestUserRole.Inspector))
      return {
        error: DeleteContestAnnouncementResponseError.PERMISSION_DENIED
      };

    if (!this.contestService.isStarted(contest) || this.contestService.isEnded(contest))
      return {
        error: DeleteContestAnnouncementResponseError.PERMISSION_DENIED
      };

    const old = {
      id: contestAnnouncement.id,
      publishTime: contestAnnouncement.publishTime,
      content: contestAnnouncement.localizedContents
    };

    await this.contestService.deleteContestAnnouncement(contestAnnouncement);
    await this.auditService.log("contest.delete_issue", AuditLogObjectType.Contest, contest.id, old);

    return {};
  }

  @Post("deleteContestIssue")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete an issue in a running contest. Only for admins and inspectors."
  })
  async deleteContestIssue(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteContestIssueRequestDto
  ): Promise<DeleteContestIssueResponseDto> {
    const contestIssue = await this.contestService.findContestIssueById(request.contestIssueId);
    if (!contestIssue)
      return {
        error: DeleteContestIssueResponseError.NO_SUCH_CONTEST_ISSUE
      };

    const contest = await this.contestService.findContestById(contestIssue.contestId);
    const role = await this.contestService.getUserRoleInContest(currentUser, contest);
    if (!(role === ContestUserRole.Admin || role === ContestUserRole.Inspector))
      return {
        error: DeleteContestIssueResponseError.PERMISSION_DENIED
      };

    const old = {
      submitterId: contestIssue.submitterId,
      submitTime: contestIssue.submitTime,
      issueContent: contestIssue.issueContent,
      replierId: contestIssue.replierId,
      replyTime: contestIssue.replyTime,
      replyContent: contestIssue.replyContent,
    };

    await this.contestService.deleteContestIssue(contestIssue);
    await this.auditService.log("contest.delete_issue", AuditLogObjectType.Contest, contest.id, {
      old
    });

    return {};
  }

  @Post("queryRanklist")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Query a contest's ranklist."
  })
  async queryRanklist(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: QueryRanklistRequestDto
  ): Promise<QueryRanklistResponseDto> {
    if (request.takeCount > this.configService.config.queryLimit.contestRanklist)
      request.takeCount = this.configService.config.queryLimit.contestRanklist;

    const contest = await this.contestService.findContestById(request.contestId);
    if (!contest)
      return {
        error: QueryRanklistResponseError.NO_SUCH_CONTEST
      };

    if (!(await this.contestService.userHasPermission(currentUser, contest, ContestPermissionType.View)))
      return {
        error: QueryRanklistResponseError.PERMISSION_DENIED
      };

    const contestMeta = await this.contestService.getContestMeta(contest);
    if (
      (await this.contestService.isRegistered(contest, currentUser)) &&
      !(await this.contestService.isEndedFor(contest, currentUser))
    ) {
      const ranklistDuringContest = contestMeta.contestOptions.ranklistDuringContest;
      if (ranklistDuringContest === "None" || request.realRanklist)
        return {
          error: QueryRanklistResponseError.PERMISSION_DENIED
        };
    }

    const [participants, count, firstRank] = await this.contestService.queryRanklist(
      contest,
      request.realRanklist,
      request.skipCount,
      request.takeCount
    );

    const [items, problems] = await Promise.all([
      Promise.all(
        participants.map(
          async (participant, i) =>
            <RanklistItemDto>{
              rank: null,
              user: await this.userService.getUserMeta(
                await this.userService.findUserById(participant.userId),
                currentUser
              ),
              detail: request.realRanklist ? participant.detailReal : participant.detailVisibleDuringContest
            }
        )
      ),
      this.problemService
        .findProblemsByExistingIds(contestMeta.problems.map(p => p.problemId))
        .then(problems =>
          Promise.all(problems.map(async problem => await this.problemService.getProblemMeta(problem, request.locale)))
        )
    ]);

    // Fill rank for items
    for (let i = 0; i < items.length; i++)
      items[i].rank =
        i === 0 || items[i].detail?.score > items[i - 1].detail?.score ? firstRank + i : items[i - 1].rank;

    return {
      contest: contestMeta,
      items,
      problems,
      count
    };
  }

  @Post("rejudgeContest")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Rejudge a contest's submissions."
  })
  async rejudgeContest(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RejudgeContestRequestDto
  ): Promise<RejudgeContestResponseDto> {
    return await this.contestService.lockContestById(request.contestId, "Write", async contest => {
      if (!contest)
        return {
          error: RejudgeContestResponseError.NO_SUCH_CONTEST
        };

      if (!(await this.contestService.userHasPermission(currentUser, contest, ContestPermissionType.Modify)))
        return {
          error: RejudgeContestResponseError.PERMISSION_DENIED
        };

      if (!(await this.contestService.startRejudge(contest, request.problemId)))
        return {
          error: RejudgeContestResponseError.REJUDGE_ALREADY_RUNNING
        };

      await this.auditService.log("contest.rejudge", AuditLogObjectType.Contest, request.contestId, {
        problemId: request.problemId
      });

      return {
        progressSubscriptionKey: this.contestService.getRejudgeProgressSubscriptionKey(contest)
      };
    });
  }
}
