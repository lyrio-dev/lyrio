import { Controller, Post, Body } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { Recaptcha } from "@nestlab/google-recaptcha";

import { ConfigService } from "@/config/config.service";
import { UserService } from "@/user/user.service";
import { GroupService } from "@/group/group.service";
import { AlternativeUrlFor, FileService } from "@/file/file.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { Locale } from "@/common/locale.type";
import { SubmissionService } from "@/submission/submission.service";
import { SubmissionStatus } from "@/submission/submission-status.enum";
import { AuditLogObjectType, AuditService } from "@/audit/audit.service";
import { DiscussionService } from "@/discussion/discussion.service";
import { PermissionService } from "@/permission/permission.service";
import { ContestService } from "@/contest/contest.service";

import { ProblemFileType } from "./problem-file.entity";
import { ProblemEntity } from "./problem.entity";
import { ProblemService, ProblemPermissionType, ProblemPermissionLevel } from "./problem.service";

import {
  CreateProblemRequestDto,
  CreateProblemResponseDto,
  CreateProblemResponseError,
  UpdateProblemStatementResponseDto,
  UpdateProblemStatementRequestDto,
  UpdateProblemStatementResponseError,
  GetProblemRequestDto,
  GetProblemResponseDto,
  GetProblemResponseError,
  SetProblemAccessControlListRequestDto,
  SetProblemAccessControlListResponseDto,
  SetProblemAccessControlListResponseError,
  SetProblemDisplayIdRequestDto,
  SetProblemDisplayIdResponseDto,
  SetProblemDisplayIdResponseError,
  SetProblemPublicRequestDto,
  SetProblemPublicResponseDto,
  SetProblemPublicResponseError,
  QueryProblemSetRequestDto,
  QueryProblemSetResponseDto,
  QueryProblemSetResponseError,
  AddProblemFileRequestDto,
  AddProblemFileResponseDto,
  AddProblemFileResponseError,
  RemoveProblemFilesRequestDto,
  RemoveProblemFilesResponseDto,
  RemoveProblemFilesResponseError,
  DownloadProblemFilesRequestDto,
  DownloadProblemFilesResponseDto,
  DownloadProblemFilesResponseError,
  RenameProblemFileRequestDto,
  RenameProblemFileResponseDto,
  RenameProblemFileResponseError,
  UpdateProblemJudgeInfoRequestDto,
  UpdateProblemJudgeInfoResponseDto,
  UpdateProblemJudgeInfoResponseError,
  CreateProblemTagRequestDto,
  CreateProblemTagResponseDto,
  CreateProblemTagResponseError,
  UpdateProblemTagRequestDto,
  UpdateProblemTagResponseDto,
  UpdateProblemTagResponseError,
  DeleteProblemTagRequestDto,
  DeleteProblemTagResponseDto,
  DeleteProblemTagResponseError,
  GetAllProblemTagsRequestDto,
  GetAllProblemTagsResponseDto,
  GetProblemTagDetailRequestDto,
  GetProblemTagDetailResponseDto,
  GetProblemTagDetailResponseError,
  GetAllProblemTagsOfAllLocalesResponseDto,
  GetAllProblemTagsOfAllLocalesResponseError,
  DeleteProblemRequestDto,
  DeleteProblemResponseDto,
  DeleteProblemResponseError,
  ChangeProblemTypeRequestDto,
  ChangeProblemTypeResponseDto,
  ChangeProblemTypeResponseError
} from "./dto";

@ApiTags("Problem")
@Controller("problem")
export class ProblemController {
  constructor(
    private readonly configService: ConfigService,
    private readonly problemService: ProblemService,
    private readonly userService: UserService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly fileService: FileService,
    private readonly submissionService: SubmissionService,
    private readonly auditService: AuditService,
    private readonly discussionService: DiscussionService,
    private readonly permissionService: PermissionService,
    private readonly contestService: ContestService
  ) {}

  @Post("queryProblemSet")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Query problems in problem set"
  })
  async queryProblemSet(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: QueryProblemSetRequestDto
  ): Promise<QueryProblemSetResponseDto> {
    if (request.takeCount > this.configService.config.queryLimit.problemSet)
      request.takeCount = this.configService.config.queryLimit.problemSet;

    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageProblem);

    // A non-privileged user could query problems owned by ieself, even use the "nonpublic" filter
    // This will NOT be reported as true in "permissions"
    if ((request.ownerId || request.nonpublic) && !hasPrivilege && (!currentUser || currentUser.id !== request.ownerId))
      return {
        error: QueryProblemSetResponseError.PERMISSION_DENIED
      };

    const filterTags = !request.tagIds
      ? null
      : (await this.problemService.findProblemTagsByExistingIds(request.tagIds)).filter(tag => tag);
    const filterOwner = !request.ownerId ? null : await this.userService.findUserById(request.ownerId);
    const [problems, count] = await this.problemService.queryProblemsAndCount(
      currentUser,
      hasPrivilege,
      request.keyword,
      filterTags ? filterTags.map(tag => tag.id) : [],
      filterOwner ? filterOwner.id : null,
      request.nonpublic,
      request.skipCount,
      request.takeCount
    );

    if (request.keyword && request.keywordMatchesId) {
      const matchId = request.keyword.substr(0, 1).toUpperCase() === "P" ? Number(request.keyword.slice(1)) || 0 : 0;
      const matchDisplayId = Number(request.keyword) || 0;
      if (!problems.some(problem => problem.id === matchId || problem.displayId === matchDisplayId)) {
        const problem = matchId
          ? await this.problemService.findProblemById(matchId)
          : matchDisplayId
          ? await this.problemService.findProblemByDisplayId(matchDisplayId)
          : null;
        if (
          problem &&
          (await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.View, hasPrivilege))
        ) {
          problems.unshift(problem);
          if (problems.length > request.takeCount) problems.pop();
        }
      }
    }

    const [acceptedSubmissions, nonAcceptedSubmissions] = await Promise.all([
      !request.titleOnly &&
        currentUser &&
        this.submissionService.getUserLatestSubmissionByProblems(currentUser, problems, true),
      !request.titleOnly &&
        currentUser &&
        this.submissionService.getUserLatestSubmissionByProblems(currentUser, problems)
    ]);

    return {
      count,
      result: await Promise.all(
        problems.map(async problem => {
          const problemTags = !request.titleOnly && (await this.problemService.getProblemTagsByProblem(problem));
          return {
            meta: await this.problemService.getProblemMeta(problem, request.locale, true),
            tags:
              !request.titleOnly &&
              (await Promise.all(
                problemTags.map(problemTag => this.problemService.getProblemTagLocalized(problemTag, request.locale))
              )),
            submission:
              !request.titleOnly &&
              currentUser &&
              (acceptedSubmissions.get(problem.id) || nonAcceptedSubmissions.get(problem.id))
          };
        })
      ),
      permissions: !request.titleOnly && {
        createProblem: await this.problemService.userHasCreateProblemPermission(currentUser),
        manageTags: hasPrivilege,
        filterByOwner: hasPrivilege,
        filterNonpublic: hasPrivilege
      },
      filterTags:
        !request.titleOnly &&
        filterTags &&
        filterTags.length &&
        (await Promise.all(
          filterTags.map(problemTag => this.problemService.getProblemTagLocalized(problemTag, request.locale))
        )),
      filterOwner: !request.titleOnly && filterOwner && (await this.userService.getUserMeta(filterOwner, currentUser))
    };
  }

  @Recaptcha()
  @Post("createProblem")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a problem with given statement and default judge info.",
    description: "Recaptcha required."
  })
  async createProblem(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateProblemRequestDto
  ): Promise<CreateProblemResponseDto> {
    if (!(await this.problemService.userHasCreateProblemPermission(currentUser)))
      return {
        error: CreateProblemResponseError.PERMISSION_DENIED
      };

    const problemTags = await this.problemService.findProblemTagsByExistingIds(request.statement.problemTagIds);
    if (problemTags.some(problemTag => problemTag == null))
      return {
        error: CreateProblemResponseError.NO_SUCH_PROBLEM_TAG
      };

    const problem = await this.problemService.createProblem(currentUser, request.type, request.statement, problemTags);
    if (!problem)
      return {
        error: CreateProblemResponseError.FAILED
      };

    await this.auditService.log("problem.create", AuditLogObjectType.Problem, problem.id, {
      type: request.type,
      statement: request.statement
    });

    return {
      id: problem.id
    };
  }

  @Post("updateStatement")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update a problem's statement."
  })
  async updateStatement(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateProblemStatementRequestDto
  ): Promise<UpdateProblemStatementResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: UpdateProblemStatementResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.Modify)))
      return {
        error: UpdateProblemStatementResponseError.PERMISSION_DENIED
      };

    const problemTags = await this.problemService.findProblemTagsByExistingIds(request.problemTagIds);
    if (problemTags.some(problemTag => problemTag == null))
      return {
        error: UpdateProblemStatementResponseError.NO_SUCH_PROBLEM_TAG
      };

    // For audit logging
    const oldStatement = {
      localizedContents: await this.problemService.getProblemAllLocalizedContents(problem),
      problemTagIds: await this.problemService.getProblemTagIdsByProblem(problem),
      samples: await this.problemService.getProblemSamples(problem)
    };

    const success = await this.problemService.updateProblemStatement(problem, request, problemTags);

    if (!success)
      return {
        error: UpdateProblemStatementResponseError.FAILED
      };

    await this.auditService.log("problem.update_statement", AuditLogObjectType.Problem, problem.id, {
      oldStatement,
      newStatement: {
        localizedContents: request.localizedContents,
        problemTagIds: request.problemTagIds,
        samples: request.samples
      }
    });

    return {};
  }

  @Post("getProblem")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get any parts of a problem.",
    description:
      "Get a problem's meta and any parts of its owner, localized contents of given locale, localized contents of all locales, samples, testdata, additional files, permissions of current user, permission for users and groups and judge info. If localized contents of given locale are request but not found, they are fallbacked to default (first) locale if none for given locale."
  })
  async getProblem(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetProblemRequestDto
  ): Promise<GetProblemResponseDto> {
    const contest = await this.contestService.findContestById(request.contestId);
    if (request.contestId && !contest)
      return {
        error: GetProblemResponseError.NO_SUCH_CONTEST
      };

    let problem: ProblemEntity;
    if (request.id) problem = await this.problemService.findProblemById(request.id);
    else if (request.displayId) problem = await this.problemService.findProblemByDisplayId(request.displayId);
    else if (contest && request.contestProblemAlias) {
      const contestProblem = await this.contestService.getContestProblem(contest, request.contestProblemAlias);
      if (contestProblem) problem = await this.problemService.findProblemById(contestProblem.problemId);
    }

    if (!problem)
      return {
        error: GetProblemResponseError.NO_SUCH_PROBLEM
      };

    const userRoleInContest = contest && (await this.contestService.getUserRoleInContest(currentUser, contest));

    if (
      contest
        ? !((await this.contestService.isProblemUsedInContest(problem, contest)) && userRoleInContest != null)
        : !(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.View))
    )
      return {
        error: GetProblemResponseError.PERMISSION_DENIED
      };

    // Restrict what a participant can access during contest
    const restrictedByContest =
      userRoleInContest === "Participant" && !(await this.contestService.isEndedFor(contest, currentUser));

    const contestOptions = contest && (await this.contestService.getContestOptions(contest.id));
    if (restrictedByContest) {
      if (
        // Tags
        ((request.tagsOfAllLocales || request.tagsOfLocale) && !contestOptions.allowSeeingProblemTags) ||
        // TestData
        (request.testData && !contestOptions.allowAccessingTestData) ||
        // Statistics
        (request.statistics && !contestOptions.showProblemStatistics) ||
        // Other things
        request.discussionCount ||
        request.accessControlList
      )
        return {
          error: GetProblemResponseError.PERMISSION_DENIED
        };
    }

    const result: GetProblemResponseDto = {
      // If requesting problem statistics in contest, querying it in contest
      meta: await this.problemService.getProblemMeta(
        problem,
        request.localizedContentsOfLocale,
        request.statistics &&
          (!contest
            ? true
            : await this.contestService.getProblemStatisticsInContest(
                contest.id,
                problem.id,
                !restrictedByContest || contestOptions.ranklistDuringContest === "Real"
              ))
      )
    };

    const promises: Promise<unknown>[] = [];

    if (request.contestId) {
      promises.push(
        this.contestService.getContestMeta(request.contestId).then(contestMeta => (result.contest = contestMeta))
      );
    }

    if (request.owner) {
      promises.push(
        this.userService
          .findUserById(problem.ownerId)
          .then(owner => this.userService.getUserMeta(owner, currentUser))
          .then(owner => (result.owner = owner))
      );
    }

    if (request.localizedContentsOfLocale != null && !request.localizedContentsTitleOnly) {
      const resultLocale = problem.locales.includes(request.localizedContentsOfLocale)
        ? request.localizedContentsOfLocale
        : problem.locales[0];

      promises.push(
        this.problemService
          .getProblemLocalizedContent(problem, resultLocale)
          .then(contentSections => (result.localizedContentsOfLocale = {
            locale: resultLocale,
            title: null,
            contentSections
          }))
      );
    }

    if (request.localizedContentsOfAllLocales) {
      promises.push(
        this.problemService
          .getProblemAllLocalizedContents(problem)
          .then(localizedContentsOfAllLocales => (result.localizedContentsOfAllLocales = localizedContentsOfAllLocales))
      );
    }

    if (request.tagsOfLocale) {
      promises.push(
        this.problemService
          .getProblemTagsByProblem(problem)
          .then(problemTags =>
            Promise.all(
              problemTags.map(problemTag =>
                this.problemService.getProblemTagLocalized(problemTag, request.tagsOfLocale)
              )
            )
          )
          .then(tagsOfLocale => (result.tagsOfLocale = tagsOfLocale))
      );
    }

    if (request.tagsOfAllLocales) {
      promises.push(
        this.problemService
          .getProblemTagsByProblem(problem)
          .then(problemTags =>
            Promise.all(
              problemTags.map(async problemTag => {
                const localizedNames = await this.problemService.getProblemTagAllLocalizedNames(problemTag);
                return {
                  id: problemTag.id,
                  color: problemTag.color,
                  localizedNames: Object.entries(localizedNames).map(([locale, name]) => ({
                    locale: locale as Locale,
                    name
                  }))
                };
              })
            )
          )
          .then(tagsOfAllLocales => (result.tagsOfAllLocales = tagsOfAllLocales))
      );
    }

    if (request.samples) {
      promises.push(this.problemService.getProblemSamples(problem).then(samples => (result.samples = samples)));
    }

    if (request.judgeInfo) {
      promises.push(
        (request.judgeInfoToBePreprocessed
          ? this.problemService.getProblemPreprocessedJudgeInfo(problem)
          : this.problemService.getProblemJudgeInfo(problem)
        ).then(tuple => ([result.judgeInfo, result.submittable] = tuple))
      );
    }

    if (request.testData) {
      promises.push(
        this.problemService
          .listProblemFiles(problem, ProblemFileType.TestData, true)
          .then(testData => (result.testData = testData))
      );
    }

    if (request.additionalFiles) {
      promises.push(
        this.problemService
          .listProblemFiles(problem, ProblemFileType.AdditionalFile, true)
          .then(additionalFiles => (result.additionalFiles = additionalFiles))
      );
    }

    if (request.discussionCount)
      promises.push(
        this.discussionService
          .getDiscussionCountOfProblem(problem)
          .then(discussionCount => (result.discussionCount = discussionCount))
      );

    if (request.permissionOfCurrentUser) {
      promises.push(
        this.problemService
          .getUserPermissions(currentUser, problem)
          .then(permissions => (result.permissionOfCurrentUser = permissions))
      );
    }

    if (request.accessControlList) {
      promises.push(
        this.problemService
          .getProblemAccessControlListWithSubjectMeta(problem, currentUser)
          .then(accessControlList => (result.accessControlList = accessControlList))
      );
    }

    if (request.lastSubmissionAndLastAcceptedSubmission) {
      promises.push(
        (async () => {
          if (currentUser) {
            const lastSubmission = (
              await this.submissionService.getUserLatestSubmissionByProblems(currentUser, [problem], false)
            ).get(problem.id);
            const lastAcceptedSubmission =
              !restrictedByContest &&
              (lastSubmission && lastSubmission.status === SubmissionStatus.Accepted
                ? lastSubmission
                : (await this.submissionService.getUserLatestSubmissionByProblems(currentUser, [problem], true)).get(
                    problem.id
                  ));

            result.lastSubmission = {
              lastSubmission:
                lastSubmission &&
                (await this.submissionService.getSubmissionBasicMeta(
                  lastSubmission,
                  restrictedByContest && contestOptions.submissionMetaVisibility
                )),
              lastAcceptedSubmission:
                lastAcceptedSubmission &&
                (await this.submissionService.getSubmissionBasicMeta(
                  lastAcceptedSubmission,
                  restrictedByContest && contestOptions.submissionMetaVisibility
                )),
              lastSubmissionContent:
                lastSubmission && (await this.submissionService.getSubmissionDetail(lastSubmission)).content
            };
          } else result.lastSubmission = {};
        })()
      );
    }

    await Promise.all(promises);

    return result;
  }

  @Post("setProblemAccessControlList")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set who and which groups have permission to read / write this problem."
  })
  async setProblemAccessControlList(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetProblemAccessControlListRequestDto
  ): Promise<SetProblemAccessControlListResponseDto> {
    if (!currentUser)
      return {
        error: SetProblemAccessControlListResponseError.PERMISSION_DENIED
      };

    return await this.problemService.lockProblemById<SetProblemAccessControlListResponseDto>(
      request.problemId,
      "Read",
      async problem => {
        if (!problem)
          return {
            error: SetProblemAccessControlListResponseError.NO_SUCH_PROBLEM,
            errorObjectId: request.problemId
          };

        if (
          !(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.ManagePermission))
        )
          return {
            error: SetProblemAccessControlListResponseError.PERMISSION_DENIED
          };

        const error = await this.permissionService.validateAccessControlList(
          request.accessControlList,
          ProblemPermissionLevel
        );
        if (error) return error;

        const old = await this.problemService.getProblemAccessControlListWithSubjectId(problem);

        await this.problemService.setProblemAccessControlList(problem, request.accessControlList);

        await this.auditService.log("problem.set_permissions", AuditLogObjectType.Problem, problem.id, {
          old,
          new: request.accessControlList
        });

        return {};
      }
    );
  }

  @Post("setProblemDisplayId")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set or clear the display ID of a problem."
  })
  async setProblemDisplayId(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetProblemDisplayIdRequestDto
  ): Promise<SetProblemDisplayIdResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);

    if (!problem)
      return {
        error: SetProblemDisplayIdResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.ManagePublicness)))
      return {
        error: SetProblemDisplayIdResponseError.PERMISSION_DENIED
      };

    if (problem.isPublic && !request.displayId) {
      return {
        error: SetProblemDisplayIdResponseError.PUBLIC_PROBLEM_MUST_HAVE_DISPLAY_ID
      };
    }

    const oldDisplayId = problem.displayId;
    if (oldDisplayId === request.displayId) return {};

    if (!(await this.problemService.setProblemDisplayId(problem, request.displayId)))
      return {
        error: SetProblemDisplayIdResponseError.DUPLICATE_DISPLAY_ID
      };

    await this.auditService.log("problem.set_display_id", AuditLogObjectType.Problem, problem.id, {
      oldDisplayId,
      newDisplayId: request.displayId
    });

    return {};
  }

  @Post("setProblemPublic")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set if a problem is public. The problem must have display ID."
  })
  async setProblemPublic(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetProblemPublicRequestDto
  ): Promise<SetProblemPublicResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);

    if (!problem)
      return {
        error: SetProblemPublicResponseError.NO_SUCH_PROBLEM
      };

    if (!problem.displayId)
      return {
        error: SetProblemPublicResponseError.NO_DISPLAY_ID
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.ManagePublicness)))
      return {
        error: SetProblemPublicResponseError.PERMISSION_DENIED
      };

    if (problem.isPublic === request.isPublic) return {};

    await this.problemService.setProblemPublic(problem, request.isPublic);

    await this.auditService.log(
      request.isPublic ? "problem.set_public" : "problem.set_non_public",
      AuditLogObjectType.Problem,
      problem.id
    );

    return {};
  }

  @Recaptcha()
  @Post("addProblemFile")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Upload or add an existing file to a problem as its testdata or additional file.",
    description: "Recaptcha required."
  })
  async addProblemFile(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: AddProblemFileRequestDto
  ): Promise<AddProblemFileResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: AddProblemFileResponseError.NO_SUCH_PROBLEM
      };

    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageProblem);

    if (
      !(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.Modify, hasPrivilege))
    )
      return {
        error: AddProblemFileResponseError.PERMISSION_DENIED
      };

    const result = await this.problemService.addProblemFile(
      problem,
      request.type,
      request.uploadInfo,
      request.filename,
      hasPrivilege
    );
    if (typeof result === "string")
      return {
        error: result as AddProblemFileResponseError
      };
    if (result)
      return {
        signedUploadRequest: result
      };

    await this.auditService.log("problem.upload_file", AuditLogObjectType.Problem, problem.id, {
      type: request.type,
      uploadInfo: request.uploadInfo,
      filename: request.filename
    });

    return {};
  }

  @Post("removeProblemFiles")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Remove files from a problem's testdata or additional files."
  })
  async removeProblemFiles(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RemoveProblemFilesRequestDto
  ): Promise<RemoveProblemFilesResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: RemoveProblemFilesResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.Modify)))
      return {
        error: RemoveProblemFilesResponseError.PERMISSION_DENIED
      };

    await this.problemService.removeProblemFiles(problem, request.type, request.filenames);

    await this.auditService.log("problem.remove_files", AuditLogObjectType.Problem, problem.id, {
      type: request.type,
      filenames: request.filenames
    });

    return {};
  }

  @Post("downloadProblemFiles")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Download some of a problem's testdata or additional files."
  })
  async downloadProblemFiles(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DownloadProblemFilesRequestDto
  ): Promise<DownloadProblemFilesResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: DownloadProblemFilesResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.View)))
      return {
        error: DownloadProblemFilesResponseError.PERMISSION_DENIED
      };

    const problemFiles = await this.problemService.listProblemFiles(problem, request.type);
    const downloadList = problemFiles.filter(
      problemFile => request.filenameList.length === 0 || request.filenameList.includes(problemFile.filename)
    );

    return {
      downloadInfo: await Promise.all(
        downloadList.map(async problemFile => ({
          filename: problemFile.filename,
          downloadUrl: await this.fileService.signDownloadLink({
            uuid: problemFile.uuid,
            downloadFilename: problemFile.filename,
            useAlternativeEndpointFor: AlternativeUrlFor.User
          })
        }))
      )
    };
  }

  @Post("renameProblemFile")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Rename a file of a problem's testdata or additional files."
  })
  async renameProblemFile(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RenameProblemFileRequestDto
  ): Promise<RenameProblemFileResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: RenameProblemFileResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.Modify)))
      return {
        error: RenameProblemFileResponseError.PERMISSION_DENIED
      };

    if (!(await this.problemService.renameProblemFile(problem, request.type, request.filename, request.newFilename)))
      return {
        error: RenameProblemFileResponseError.NO_SUCH_FILE
      };

    if (request.filename !== request.newFilename)
      await this.auditService.log("problem.rename_file", AuditLogObjectType.Problem, problem.id, {
        type: request.type,
        oldFilename: request.filename,
        newFilename: request.newFilename
      });

    return {};
  }

  @Post("updateProblemJudgeInfo")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update a problem's judge info."
  })
  async updateProblemJudgeInfo(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateProblemJudgeInfoRequestDto
  ): Promise<UpdateProblemJudgeInfoResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: UpdateProblemJudgeInfoResponseError.NO_SUCH_PROBLEM
      };

    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageProblem);

    if (
      !(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.Modify, hasPrivilege))
    )
      return {
        error: UpdateProblemJudgeInfoResponseError.PERMISSION_DENIED
      };

    const old = await this.problemService.getProblemJudgeInfo(problem);

    const judgeInfoError = await this.problemService.updateProblemJudgeInfo(
      problem,
      request.judgeInfo,
      request.submittable,
      hasPrivilege
    );
    if (judgeInfoError)
      return {
        error: UpdateProblemJudgeInfoResponseError.INVALID_JUDGE_INFO,
        judgeInfoError
      };

    await this.auditService.log("problem.update_judge_info", AuditLogObjectType.Problem, problem.id, {
      old,
      new: [request.judgeInfo, request.submittable]
    });

    return {};
  }

  @Post("getAllProblemTags")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get all problem tags with the name of given locale."
  })
  async getAllProblemTags(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetAllProblemTagsRequestDto
  ): Promise<GetAllProblemTagsResponseDto> {
    const problemTags = await this.problemService.getAllProblemTags();
    return {
      tags: await Promise.all(
        problemTags.map(problemTag => this.problemService.getProblemTagLocalized(problemTag, request.locale))
      )
    };
  }

  @Post("createProblemTag")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a new problem tag."
  })
  async createProblemTag(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateProblemTagRequestDto
  ): Promise<CreateProblemTagResponseDto> {
    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageProblem)))
      return {
        error: CreateProblemTagResponseError.PERMISSION_DENIED
      };

    const problemTag = await this.problemService.createProblemTag(
      request.localizedNames.map(({ locale, name }) => [locale, name]),
      request.color
    );

    await this.auditService.log("problem_tag.create", AuditLogObjectType.ProblemTag, problemTag.id);

    return {
      id: problemTag.id
    };
  }

  @Post("getProblemTagDetail")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the meta and all localized names of a problem tag."
  })
  async getProblemTagDetail(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetProblemTagDetailRequestDto
  ): Promise<GetProblemTagDetailResponseDto> {
    const problemTag = await this.problemService.findProblemTagById(request.id);
    if (!problemTag)
      return {
        error: GetProblemTagDetailResponseError.NO_SUCH_PROBLEM_TAG
      };

    const localizedNames = await this.problemService.getProblemTagAllLocalizedNames(problemTag);
    return {
      id: problemTag.id,
      color: problemTag.color,
      localizedNames: Object.entries(localizedNames).map(([locale, name]) => ({ locale: locale as Locale, name }))
    };
  }

  @Post("updateProblemTag")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update a problem tag's localized names and color."
  })
  async updateProblemTag(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateProblemTagRequestDto
  ): Promise<UpdateProblemTagResponseDto> {
    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageProblem)))
      return {
        error: UpdateProblemTagResponseError.PERMISSION_DENIED
      };

    const problemTag = await this.problemService.findProblemTagById(request.id);
    if (!problemTag)
      return {
        error: UpdateProblemTagResponseError.NO_SUCH_PROBLEM_TAG
      };

    const oldLocalizedNames = await this.problemService.getProblemTagAllLocalizedNames(problemTag);
    const oldColor = problemTag.color;

    const localizedNameTuples: [Locale, string][] = request.localizedNames.map(({ locale, name }) => [locale, name]);
    await this.problemService.updateProblemTag(problemTag, localizedNameTuples, request.color);

    await this.auditService.log("problem_tag.update", AuditLogObjectType.ProblemTag, problemTag.id, {
      oldLocalizedNames,
      oldColor,
      newLocalizedNames: Object.fromEntries(localizedNameTuples),
      newColor: request.color
    });

    return {};
  }

  @Post("deleteProblemTag")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete a problem tag and remove the tag from all problems."
  })
  async deleteProblemTag(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteProblemTagRequestDto
  ): Promise<DeleteProblemTagResponseDto> {
    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageProblem)))
      return {
        error: DeleteProblemTagResponseError.PERMISSION_DENIED
      };

    const problemTag = await this.problemService.findProblemTagById(request.id);
    if (!problemTag)
      return {
        error: DeleteProblemTagResponseError.NO_SUCH_PROBLEM_TAG
      };

    const localizedNames = await this.problemService.getProblemTagAllLocalizedNames(problemTag);

    await this.problemService.deleteProblemTag(problemTag);

    await this.auditService.log("problem_tag.delete", AuditLogObjectType.ProblemTag, problemTag.id, {
      localizedNames,
      color: problemTag.color
    });

    return {};
  }

  @Post("getAllProblemTagsOfAllLocales")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the meta and all localized names of all problem tags."
  })
  async getAllProblemTagsOfAllLocales(
    @CurrentUser() currentUser: UserEntity
  ): Promise<GetAllProblemTagsOfAllLocalesResponseDto> {
    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageProblem)))
      return {
        error: GetAllProblemTagsOfAllLocalesResponseError.PERMISSION_DENIED
      };

    const problemTags = await this.problemService.getAllProblemTags();

    return {
      tags: await Promise.all(
        problemTags.map(async problemTag => {
          const localizedNames = await this.problemService.getProblemTagAllLocalizedNames(problemTag);
          return {
            id: problemTag.id,
            color: problemTag.color,
            localizedNames: Object.entries(localizedNames).map(([locale, name]) => ({
              locale: locale as Locale,
              name
            }))
          };
        })
      )
    };
  }

  @Post("deleteProblem")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete a problem and everything related."
  })
  async deleteProblem(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteProblemRequestDto
  ): Promise<DeleteProblemResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);

    if (!problem)
      return {
        error: DeleteProblemResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.Delete)))
      return {
        error: DeleteProblemResponseError.PERMISSION_DENIED
      };

    if (!(await this.contestService.isProblemUsedInContest(problem)))
      return {
        error: DeleteProblemResponseError.PROBLEM_USED_IN_CONTEST
      };

    // Lock the problem after permission check to avoid DDoS attacks.
    return await this.problemService.lockProblemById<DeleteProblemResponseDto>(
      request.problemId,
      "Write",
      // eslint-disable-next-line @typescript-eslint/no-shadow
      async problem => {
        if (!problem)
          return {
            error: DeleteProblemResponseError.NO_SUCH_PROBLEM
          };

        const statement = {
          judgeInfo: await this.problemService.getProblemJudgeInfo(problem),
          localizedContents: await this.problemService.getProblemAllLocalizedContents(problem),
          samples: await this.problemService.getProblemSamples(problem)
        };

        await this.problemService.deleteProblem(problem);

        await this.auditService.log("problem.delete", AuditLogObjectType.Problem, problem.id, {
          type: problem.type,
          isPublic: problem.isPublic,
          displayId: problem.displayId,
          statement
        });

        return {};
      }
    );
  }

  @Post("changeProblemType")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Change a problem (with no submissions)'s type"
  })
  async changeProblemType(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: ChangeProblemTypeRequestDto
  ): Promise<ChangeProblemTypeResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);

    if (!problem)
      return {
        error: ChangeProblemTypeResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.Delete)))
      return {
        error: ChangeProblemTypeResponseError.PERMISSION_DENIED
      };

    // Lock the problem after permission check to avoid DDoS attacks.
    return await this.problemService.lockProblemById<ChangeProblemTypeResponseDto>(
      request.problemId,
      "Write",
      // eslint-disable-next-line @typescript-eslint/no-shadow
      async problem => {
        if (!problem)
          return {
            error: ChangeProblemTypeResponseError.NO_SUCH_PROBLEM
          };

        const oldType = problem.type;
        const [oldJudgeInfo] = await this.problemService.getProblemJudgeInfo(problem);

        if (!(await this.problemService.changeProblemType(problem, request.type)))
          return {
            error: ChangeProblemTypeResponseError.PROBLEM_HAS_SUBMISSION
          };

        await this.auditService.log("problem.change_type", AuditLogObjectType.Problem, problem.id, {
          oldType,
          oldJudgeInfo
        });

        return {};
      }
    );
  }
}
