import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ConfigService } from "@/config/config.service";
import { UserService } from "@/user/user.service";
import { GroupService } from "@/group/group.service";
import { FileService } from "@/file/file.service";
import { ProblemService, ProblemPermissionType, ProblemPermissionLevel } from "./problem.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { ProblemEntity } from "./problem.entity";
import { ProblemFileType } from "./problem-file.entity";

import {
  CreateProblemRequestDto,
  CreateProblemResponseDto,
  CreateProblemResponseError,
  UpdateProblemStatementResponseDto,
  UpdateProblemStatementRequestDto,
  UpdateProblemStatementResponseError,
  GetProblemDetailRequestDto,
  GetProblemDetailResponseDto,
  GetProblemDetailResponseError,
  SetProblemPermissionsRequestDto,
  SetProblemPermissionsResponseDto,
  SetProblemPermissionsResponseError,
  SetProblemDisplayIdRequestDto,
  SetProblemDisplayIdResponseDto,
  SetProblemDisplayIdResponseError,
  SetProblemPublicRequestDto,
  SetProblemPublicResponseDto,
  SetProblemPublicResponseError,
  GetProblemPermissionsRequestDto,
  GetProblemPermissionsResponseDto,
  GetProblemPermissionsResponseError,
  QueryProblemSetRequestDto,
  QueryProblemSetResponseDto,
  QueryProblemSetErrorDto,
  GetProblemStatementsAllLocalesRequestDto,
  GetProblemStatementsAllLocalesResponseDto,
  GetProblemStatementsAllLocalesResponseError,
  AddProblemFileRequestDto,
  AddProblemFileResponseDto,
  AddProblemFileResponseError,
  RemoveProblemFilesRequestDto,
  RemoveProblemFilesResponseDto,
  RemoveProblemFilesResponseError,
  ListProblemFilesRequestDto,
  ListProblemFilesResponseDto,
  ListProblemFilesResponseError,
  DownloadProblemFilesRequestDto,
  DownloadProblemFilesResponseDto,
  DownloadProblemFilesResponseError,
  GetProblemAllFilesRequestDto,
  GetProblemAllFilesResponseDto,
  GetProblemAllFilesResponseError,
  RenameProblemFileRequestDto,
  RenameProblemFileResponseDto,
  RenameProblemFileResponseError,
  GetProblemJudgeInfoRequestDto,
  GetProblemJudgeInfoResponseDto,
  GetProblemJudgeInfoResponseError,
  UpdateProblemJudgeInfoRequestDto,
  UpdateProblemJudgeInfoResponseDto,
  UpdateProblemJudgeInfoResponseError
} from "./dto";
import { GroupEntity } from "@/group/group.entity";

@ApiTags("Problem")
@Controller("problem")
export class ProblemController {
  constructor(
    private readonly configService: ConfigService,
    private readonly problemService: ProblemService,
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    private readonly fileService: FileService
  ) {}

  @Post("queryProblemSet")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Query problems in problem set"
  })
  async queryProblemSet(
    @CurrentUser() CurrentUser: UserEntity,
    @Body() request: QueryProblemSetRequestDto
  ): Promise<QueryProblemSetResponseDto> {
    if (request.takeCount > this.configService.config.queryLimit.problemSetProblemsTake)
      return {
        error: QueryProblemSetErrorDto.TAKE_TOO_MANY
      };

    const [problems, count] = await this.problemService.queryProblemsAndCount(request.skipCount, request.takeCount);

    const response: QueryProblemSetResponseDto = {
      count: count,
      result: []
    };

    for (const problem of problems) {
      const titleLocale = problem.locales.includes(request.locale) ? request.locale : problem.locales[0];
      const title = await this.problemService.getProblemLocalizedTitle(problem, titleLocale);
      response.result.push({
        meta: {
          id: problem.id,
          displayId: problem.displayId,
          type: problem.type,
          isPublic: problem.isPublic,
          ownerId: problem.ownerId,
          locales: problem.locales
        },

        title: title,
        titleLocale: titleLocale
      });
    }

    return response;
  }

  @Post("createProblem")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a problem with given statement and default judge info."
  })
  async createProblem(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateProblemRequestDto
  ): Promise<CreateProblemResponseDto> {
    // TODO: Add permission for create problem
    if (false)
      return {
        error: CreateProblemResponseError.PERMISSION_DENIED
      };

    const problem = await this.problemService.createProblem(currentUser, request.type, request.statement);
    if (!problem)
      return {
        error: CreateProblemResponseError.FAILED
      };

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

      if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
      return {
        error: UpdateProblemStatementResponseError.PERMISSION_DENIED
      };

    const success = await this.problemService.updateProblemStatement(problem, request);

    if (!success)
      return {
        error: UpdateProblemStatementResponseError.FAILED
      };

    return {};
  }

  @Get("getProblemStatementsAllLocales")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a problem's meta, title, contents, of ALL locales."
  })
  async getProblemStatementsAllLocales(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: GetProblemStatementsAllLocalesRequestDto
  ): Promise<GetProblemStatementsAllLocalesResponseDto> {
    let problem: ProblemEntity;
    if (request.id) problem = await this.problemService.findProblemById(parseInt(request.id));
    else if (request.displayId) problem = await this.problemService.findProblemByDisplayId(parseInt(request.displayId));

    if (!problem)
      return {
        error: GetProblemStatementsAllLocalesResponseError.NO_SUCH_PROBLEM
      };

      if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
      return {
        error: GetProblemStatementsAllLocalesResponseError.PERMISSION_DENIED
      };

    const samples = await this.problemService.getProblemSamples(problem);
    const localizedContents = await this.problemService.getProblemAllLocalizedContents(problem);

    return {
      meta: {
        id: problem.id,
        displayId: problem.displayId,
        type: problem.type,
        isPublic: problem.isPublic,
        ownerId: problem.ownerId,
        locales: problem.locales
      },
      statement: {
        samples: samples,
        localizedContents: localizedContents
      },
      haveWritePermission: await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)
    };
  }

  @Get("getProblemDetail")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a problem's meta, owner, title, contents, samples, additional files and judge info of given locale.",
    description: "Title and contents are fallbacked to default (first) locale if none for given locale."
  })
  async getProblemDetail(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: GetProblemDetailRequestDto
  ): Promise<GetProblemDetailResponseDto> {
    let problem: ProblemEntity;
    if (request.id) problem = await this.problemService.findProblemById(parseInt(request.id));
    else if (request.displayId) problem = await this.problemService.findProblemByDisplayId(parseInt(request.displayId));

    if (!problem)
      return {
        error: GetProblemDetailResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
      return {
        error: GetProblemDetailResponseError.PERMISSION_DENIED
      };

    const resultLocale = problem.locales.includes(request.locale) ? request.locale : problem.locales[0];

    const title = await this.problemService.getProblemLocalizedTitle(problem, resultLocale);
    const contentSections = await this.problemService.getProblemLocalizedContent(problem, resultLocale);
    const samples = await this.problemService.getProblemSamples(problem);
    const judgeInfo = await this.problemService.getProblemJudgeInfo(problem);
    const additionalFiles = await this.problemService.listProblemFiles(problem, ProblemFileType.AdditionalFile, true);

    return {
      meta: {
        id: problem.id,
        displayId: problem.displayId,
        type: problem.type,
        isPublic: problem.isPublic,
        ownerId: problem.ownerId,
        locales: problem.locales
      },
      permission: {
        modify: await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY),
        managePermission: await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MANAGE_PERMISSION),
        managePublicness: await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MANAGE_PUBLICNESS),
        delete: await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.DELETE)
      },
      resultLocale: resultLocale,
      title: title,
      samples: samples,
      contentSections: contentSections,
      additionalFiles: additionalFiles,
      judgeInfo: judgeInfo
    };
  }

  @Post("setProblemPermissions")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set who and which groups have permission to read / write this problem."
  })
  async setProblemPermissions(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetProblemPermissionsRequestDto
  ): Promise<SetProblemPermissionsResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: SetProblemPermissionsResponseError.NO_SUCH_PROBLEM,
        errorObjectId: request.problemId
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MANAGE_PERMISSION)))
      return {
        error: SetProblemPermissionsResponseError.PERMISSION_DENIED
      };

    const userPermissions: [UserEntity, ProblemPermissionLevel][] = [];
    for (const { userId, permissionLevel } of request.userPermissions) {
      const user = await this.userService.findUserById(userId);
      if (!user)
        return {
          error: SetProblemPermissionsResponseError.NO_SUCH_USER,
          errorObjectId: userId
        };

      userPermissions.push([user, permissionLevel]);
    }

    const groupPermissions: [GroupEntity, ProblemPermissionLevel][] = [];
    for (const { groupId, permissionLevel } of request.groupPermissions) {
      const group = await this.groupService.findGroupById(groupId);
      if (!group)
        return {
          error: SetProblemPermissionsResponseError.NO_SUCH_GROUP,
          errorObjectId: groupId
        };

      groupPermissions.push([group, permissionLevel]);
    }

    await this.problemService.setProblemPermissions(problem, userPermissions, groupPermissions);

    return {};
  }

  @Get("getProblemPermissions")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get who and which groups have permission to read / write this problem."
  })
  async getProblemPermissions(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: GetProblemPermissionsRequestDto
  ): Promise<GetProblemPermissionsResponseDto> {
    const problem = await this.problemService.findProblemById(parseInt(request.problemId));
    if (!problem)
      return {
        error: GetProblemPermissionsResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
      return {
        error: GetProblemPermissionsResponseError.PERMISSION_DENIED
      };

    const [userPermissions, groupPermissions] = await this.problemService.getProblemPermissions(problem);
    const owner = await this.userService.findUserById(problem.ownerId);

    return {
      owner: await this.userService.getUserMeta(owner),
      userPermissions: await Promise.all(
        userPermissions.map(async ([user, permissionLevel]) => ({
          user: await this.userService.getUserMeta(user),
          permissionLevel: permissionLevel
        }))
      ),
      groupPermissions: await Promise.all(
        groupPermissions.map(async ([group, permissionLevel]) => ({
          group: await this.groupService.getGroupMeta(group),
          permissionLevel: permissionLevel
        }))
      )
    };
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

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MANAGE_PUBLICNESS)))
      return {
        error: SetProblemDisplayIdResponseError.PERMISSION_DENIED
      };

    if (problem.isPublic && !request.displayId) {
      return {
        error: SetProblemDisplayIdResponseError.PUBLIC_PROBLEM_MUST_HAVE_DISPLAY_ID
      };
    }

    if (!(await this.problemService.setProblemDisplayId(problem, request.displayId)))
      return {
        error: SetProblemDisplayIdResponseError.DUPLICATE_DISPLAY_ID
      };

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

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MANAGE_PUBLICNESS)))
      return {
        error: SetProblemPublicResponseError.PERMISSION_DENIED
      };

    await this.problemService.setProblemPublic(problem, request.isPublic);

    return {};
  }

  @Post("addProblemFile")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Upload or add an existing file to a problem as its testdata or additional file."
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

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
      return {
        error: AddProblemFileResponseError.PERMISSION_DENIED
      };

    if (!(await this.problemService.addProblemFile(problem, request.sha256, request.type, request.filename))) {
      const [uuid, uploadUrl] = await this.fileService.createUploadUrl(request.sha256);
      return {
        error: AddProblemFileResponseError.UPLOAD_REQUIRED,
        uploadUrl: uploadUrl,
        uploadUuid: uuid
      };
    }

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

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
      return {
        error: RemoveProblemFilesResponseError.PERMISSION_DENIED
      };

    await this.problemService.removeProblemFiles(problem, request.type, request.filenames);

    return {};
  }

  @Post("listProblemFiles")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List testdata or additional files of a problem."
  })
  async listProblemFiles(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: ListProblemFilesRequestDto
  ): Promise<ListProblemFilesResponseDto> {
    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: ListProblemFilesResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
      return {
        error: ListProblemFilesResponseError.PERMISSION_DENIED
      };

    const problemFiles = await this.problemService.listProblemFiles(problem, request.type, true);

    return {
      problemFiles: problemFiles.map(problemFile => ({
        uuid: problemFile.uuid,
        filename: problemFile.filename,
        size: problemFile.size
      }))
    };
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

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
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
          downloadUrl: await this.fileService.getDownloadLink(problemFile.uuid, problemFile.filename)
        }))
      )
    };
  }

  @Get("getProblemAllFiles")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a problem's testdata, additional files and permission of current user by its ID or display ID."
  })
  async getProblemAllFiles(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: GetProblemAllFilesRequestDto
  ): Promise<GetProblemAllFilesResponseDto> {
    let problem: ProblemEntity;
    if (request.id) problem = await this.problemService.findProblemById(parseInt(request.id));
    else if (request.displayId) problem = await this.problemService.findProblemByDisplayId(parseInt(request.displayId));

    if (!problem)
      return {
        error: GetProblemAllFilesResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
      return {
        error: GetProblemAllFilesResponseError.PERMISSION_DENIED
      };

    const testdata = await this.problemService.listProblemFiles(problem, ProblemFileType.TestData, true);
    const additionalFiles = await this.problemService.listProblemFiles(problem, ProblemFileType.AdditionalFile, true);

    return {
      meta: {
        id: problem.id,
        displayId: problem.displayId,
        type: problem.type,
        isPublic: problem.isPublic,
        ownerId: problem.ownerId,
        locales: problem.locales
      },
      testdata: testdata,
      additionalFiles: additionalFiles,
      haveWritePermission: await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)
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

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
      return {
        error: RenameProblemFileResponseError.PERMISSION_DENIED
      };

    if (!(await this.problemService.renameProblemFile(problem, request.type, request.filename, request.newFilename)))
      return {
        error: RenameProblemFileResponseError.NO_SUCH_FILE
      };

    return {};
  }

  @Get("getProblemJudgeInfo")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a problem's judge info and permission of current user by its ID or display ID."
  })
  async getProblemJudgeInfo(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: GetProblemJudgeInfoRequestDto
  ): Promise<GetProblemJudgeInfoResponseDto> {
    let problem: ProblemEntity;
    if (request.id) problem = await this.problemService.findProblemById(parseInt(request.id));
    else if (request.displayId) problem = await this.problemService.findProblemByDisplayId(parseInt(request.displayId));

    if (!problem)
      return {
        error: GetProblemJudgeInfoResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
      return {
        error: GetProblemJudgeInfoResponseError.PERMISSION_DENIED
      };

    const judgeInfo = await this.problemService.getProblemJudgeInfo(problem);

    return {
      meta: {
        id: problem.id,
        displayId: problem.displayId,
        type: problem.type,
        isPublic: problem.isPublic,
        ownerId: problem.ownerId,
        locales: problem.locales
      },
      judgeInfo: judgeInfo,
      haveWritePermission: await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)
    };
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

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
      return {
        error: UpdateProblemJudgeInfoResponseError.PERMISSION_DENIED
      };

    await this.problemService.updateProblemJudgeInfo(problem, request.judgeInfo);

    return {};
  }
}
