import { Controller, Post, Body } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { Recaptcha } from "@nestlab/google-recaptcha";

import { ConfigService } from "@/config/config.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { UserService } from "@/user/user.service";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { AuditLogObjectType, AuditService } from "@/audit/audit.service";
import { ProblemPermissionType, ProblemService } from "@/problem/problem.service";
import { GroupEntity } from "@/group/group.entity";
import { GroupService } from "@/group/group.service";
import { isEmoji } from "@/common/validators";

import {
  DiscussionPermissionType,
  DiscussionReactionType,
  DiscussionService,
  DiscussionPermissionLevel
} from "./discussion.service";
import { DiscussionReplyEntity } from "./discussion-reply.entity";

import { UserMetaDto } from "@/user/dto";

import {
  CreateDiscussionRequestDto,
  CreateDiscussionResponseDto,
  CreateDiscussionResponseError,
  DiscussionReplyDto,
  DiscussionOrReplyReactionsDto,
  GetDiscussionAndRepliesRequestDto,
  GetDiscussionAndRepliesRequestQueryRepliesType,
  GetDiscussionAndRepliesResponseDto,
  GetDiscussionAndRepliesResponseError,
  QueryDiscussionsRequestDto,
  QueryDiscussionsResponseDto,
  QueryDiscussionsResponseError,
  UpdateDiscussionRequestDto,
  UpdateDiscussionResponseDto,
  UpdateDiscussionResponseError,
  UpdateDiscussionReplyRequestDto,
  UpdateDiscussionReplyResponseDto,
  UpdateDiscussionReplyResponseError,
  DeleteDiscussionReplyRequestDto,
  DeleteDiscussionReplyResponseDto,
  DeleteDiscussionReplyResponseError,
  DeleteDiscussionRequestDto,
  DeleteDiscussionResponseDto,
  DeleteDiscussionResponseError,
  SetDiscussionReplyPublicRequestDto,
  SetDiscussionReplyPublicResponseDto,
  SetDiscussionReplyPublicResponseError,
  SetDiscussionPublicRequestDto,
  SetDiscussionPublicResponseDto,
  SetDiscussionPublicResponseError,
  SetDiscussionPermissionsRequestDto,
  SetDiscussionPermissionsResponseDto,
  SetDiscussionPermissionsResponseError,
  CreateDiscussionReplyRequestDto,
  CreateDiscussionReplyResponseDto,
  CreateDiscussionReplyResponseError,
  ToggleReactionRequestDto,
  ToggleReactionResponseDto,
  ToggleReactionResponseError,
  QueryDiscussionsResponseProblemDto,
  GetDiscussionAndRepliesResponseProblemDto,
  GetDiscussionPermissionsRequestDto,
  GetDiscussionPermissionsResponseDto,
  GetDiscussionPermissionsResponseError
} from "./dto";

@ApiTags("Discussion")
@Controller("discussion")
export class DiscussionController {
  readonly reactionEmojisBlacklist: (string | RegExp)[];

  constructor(
    private readonly discussionService: DiscussionService,
    private readonly problemService: ProblemService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly groupService: GroupService,
    private readonly auditService: AuditService
  ) {
    this.reactionEmojisBlacklist = [
      this.configService.config.preference.serverSideOnly.discussionReactionCustomEmojisBlacklist
    ]
      .flat()
      .map((value: string) => (value.startsWith("/") && value.endsWith("/") ? new RegExp(value.slice(1, -1)) : value));
  }

  @Recaptcha()
  @Post("createDiscussion")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a new discussion.",
    description: "Recaptcha required."
  })
  async createDiscussion(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateDiscussionRequestDto
  ): Promise<CreateDiscussionResponseDto> {
    if (!(await this.discussionService.userHasCreateDiscussionPermission(currentUser)))
      return {
        error: CreateDiscussionResponseError.PERMISSION_DENIED
      };

    const problem = request.problemId && (await this.problemService.findProblemById(request.problemId));
    if (request.problemId) {
      if (!problem)
        return {
          error: CreateDiscussionResponseError.NO_SUCH_PROBLEM
        };

      // Should we add a permission type "publish discussion"?
      if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.View)))
        return {
          error: CreateDiscussionResponseError.PERMISSION_DENIED
        };
    }

    const discussion = await this.discussionService.createDiscussion(
      currentUser,
      request.title,
      request.content,
      problem
    );

    return {
      discussionId: discussion.id
    };
  }

  @Recaptcha()
  @Post("createDiscussionReply")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a new discussion.",
    description: "Recaptcha required."
  })
  async createDiscussionReply(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateDiscussionReplyRequestDto
  ): Promise<CreateDiscussionReplyResponseDto> {
    const discussion = await this.discussionService.findDiscussionById(request.discussionId);

    if (!discussion)
      return {
        error: CreateDiscussionReplyResponseError.NO_SUCH_DISCUSSION
      };

    // Should we add a permission type "reply/reaction"?
    if (
      !currentUser ||
      !(await this.discussionService.userHasPermission(currentUser, discussion, DiscussionPermissionType.View))
    )
      return {
        error: CreateDiscussionReplyResponseError.PERMISSION_DENIED
      };

    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(
      currentUser,
      UserPrivilegeType.ManageDiscussion
    );

    const reply = await this.discussionService.addReply(currentUser, discussion, request.content);

    return {
      reply: {
        id: reply.id,
        content: reply.content,
        publishTime: reply.publishTime,
        editTime: reply.editTime,
        isPublic: reply.isPublic,
        publisher: await this.userService.getUserMeta(currentUser, currentUser),
        reactions: {
          count: {},
          currentUserReactions: []
        },
        permissions: await this.discussionService.getUserPermissionsOfReply(currentUser, reply, hasPrivilege)
      }
    };
  }

  @Post("toggleReaction")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Add or remove a reaction emoji to/from a discussion or reply."
  })
  async toggleReaction(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: ToggleReactionRequestDto
  ): Promise<ToggleReactionResponseDto> {
    const discussionReply =
      request.type === DiscussionReactionType.DiscussionReply &&
      (await this.discussionService.findDiscussionReplyById(request.id));
    if (request.type === DiscussionReactionType.DiscussionReply && !discussionReply)
      return {
        error: ToggleReactionResponseError.NO_SUCH_DISCUSSION_REPLY
      };

    const discussion = await this.discussionService.findDiscussionById(
      request.type === DiscussionReactionType.DiscussionReply ? discussionReply.discussionId : request.id
    );

    if (!discussion)
      return {
        error: ToggleReactionResponseError.NO_SUCH_DISCUSSION
      };

    // Should we add a permission type "reply/reaction"?
    if (
      !currentUser ||
      !(await this.discussionService.userHasPermission(currentUser, discussion, DiscussionPermissionType.View))
    )
      return {
        error: ToggleReactionResponseError.PERMISSION_DENIED
      };

    if (
      !(
        (this.configService.config.preference.misc.discussionReactionAllowCustomEmojis &&
          this.reactionEmojisBlacklist.every(value =>
            value instanceof RegExp ? !value.test(request.emoji) : value !== request.emoji
          )) ||
        this.configService.config.preference.misc.discussionReactionEmojis.includes(request.emoji)
      ) ||
      !isEmoji(request.emoji)
    )
      return {
        error: ToggleReactionResponseError.INVALID_EMOJI
      };

    if (request.reaction)
      await this.discussionService.addReaction(request.type, request.id, currentUser, request.emoji);
    else await this.discussionService.removeReaction(request.type, request.id, currentUser, request.emoji);

    return {};
  }

  @Post("queryDiscussion")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a list of specfied discussions."
  })
  async queryDiscussions(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: QueryDiscussionsRequestDto
  ): Promise<QueryDiscussionsResponseDto> {
    if (request.takeCount > this.configService.config.queryLimit.discussions)
      return {
        error: QueryDiscussionsResponseError.TAKE_TOO_MANY
      };

    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(
      currentUser,
      UserPrivilegeType.ManageDiscussion
    );

    const filterProblem = !request.problemId ? null : await this.problemService.findProblemById(request.problemId);
    const filterPublisher = !request.publisherId ? null : await this.userService.findUserById(request.publisherId);
    const [discussions, count] = await this.discussionService.queryDiscussionsAndCount(
      currentUser,
      hasPrivilege,
      request.keyword,
      filterProblem || request.problemId === -1 ? request.problemId : null,
      filterPublisher ? request.publisherId : null,
      request.nonpublic,
      request.skipCount,
      request.takeCount
    );

    const problems: Record<number, QueryDiscussionsResponseProblemDto> =
      !request.titleOnly &&
      Object.fromEntries(
        await Promise.all(
          [
            filterProblem,
            ...(await this.problemService.findProblemsByExistingIds(
              discussions.map(discussion => discussion.problemId).filter(id => id && id !== filterProblem?.id)
            ))
          ]
            .filter(problem => problem)
            .map(async problem => {
              const titleLocale = problem.locales.includes(request.locale) ? request.locale : problem.locales[0];
              const title = await this.problemService.getProblemLocalizedTitle(problem, titleLocale);
              return [
                problem.id,
                <QueryDiscussionsResponseProblemDto>{
                  meta: problem,
                  title,
                  titleLocale
                }
              ];
            })
        )
      );

    const publishers: Record<number, UserMetaDto> =
      !request.titleOnly &&
      Object.fromEntries(
        await Promise.all(
          [
            filterPublisher,
            ...(await this.userService.findUsersByExistingIds(
              discussions.map(discussion => discussion.publisherId).filter(id => id && id !== filterPublisher?.id)
            ))
          ]
            .filter(user => user)
            .map(async user => [user.id, await this.userService.getUserMeta(user, currentUser)])
        )
      );

    return {
      discussions: await Promise.all(
        discussions.map(async discussion => ({
          meta: discussion,
          problem: !request.titleOnly && problems[discussion.problemId],
          publisher: publishers[discussion.publisherId]
        }))
      ),
      permissions: !request.titleOnly && {
        createDiscussion: await this.discussionService.userHasCreateDiscussionPermission(currentUser),
        filterNonpublic: hasPrivilege
      },
      count,
      filterPublisher:
        !request.titleOnly && filterPublisher && (await this.userService.getUserMeta(filterPublisher, currentUser)),
      filterProblem: !request.titleOnly && problems[filterProblem?.id]
    };
  }

  @Post("getDiscussionPermissions")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get which users and groups have which permissions of the discussion."
  })
  async getDiscussionPermissions(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetDiscussionPermissionsRequestDto
  ): Promise<GetDiscussionPermissionsResponseDto> {
    const discussion = await this.discussionService.findDiscussionById(request.id);
    if (!discussion)
      return {
        error: GetDiscussionPermissionsResponseError.NO_SUCH_DISCUSSION
      };

    if (!(await this.discussionService.userHasPermission(currentUser, discussion, DiscussionPermissionType.View)))
      return {
        error: GetDiscussionPermissionsResponseError.PERMISSION_DENIED
      };

    const [userPermissions, groupPermissions] = await this.discussionService.getDiscussionPermissions(discussion);

    return {
      permissions: {
        userPermissions: await Promise.all(
          userPermissions.map(async ([user, permissionLevel]) => ({
            user: await this.userService.getUserMeta(user, currentUser),
            permissionLevel
          }))
        ),
        groupPermissions: await Promise.all(
          groupPermissions.map(async ([group, permissionLevel]) => ({
            group: await this.groupService.getGroupMeta(group),
            permissionLevel
          }))
        )
      },
      haveManagePermissionsPermission: await this.discussionService.userHasPermission(
        currentUser,
        discussion,
        DiscussionPermissionType.ManagePermission
      )
    };
  }

  @Post("getDiscussionAndReplies")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a discussion or/and some of its replies."
  })
  async getDiscussionAndReplies(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetDiscussionAndRepliesRequestDto
  ): Promise<GetDiscussionAndRepliesResponseDto> {
    const headTakeCount = request.headTakeCount || 0;
    const tailTakeCount = request.tailTakeCount || 0;
    const idRangeTakeCount = request.idRangeTakeCount || 0;

    const realTakeCount =
      request.queryRepliesType === GetDiscussionAndRepliesRequestQueryRepliesType.HeadTail
        ? headTakeCount + tailTakeCount
        : request.queryRepliesType === GetDiscussionAndRepliesRequestQueryRepliesType.IdRange
        ? idRangeTakeCount
        : 0;
    if (realTakeCount > this.configService.config.queryLimit.discussionReplies)
      return {
        error: GetDiscussionAndRepliesResponseError.TAKE_TOO_MANY
      };

    const discussion = await this.discussionService.findDiscussionById(request.discussionId);
    if (!discussion)
      return {
        error: GetDiscussionAndRepliesResponseError.NO_SUCH_DISCUSSION
      };

    const discussionProblem = discussion.problemId && (await this.problemService.findProblemById(discussion.problemId));
    if (
      !(await this.discussionService.userHasPermission(
        currentUser,
        discussion,
        DiscussionPermissionType.View,
        discussionProblem
      ))
    )
      return {
        error: GetDiscussionAndRepliesResponseError.PERMISSION_DENIED
      };

    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(
      currentUser,
      UserPrivilegeType.ManageDiscussion
    );

    const result: GetDiscussionAndRepliesResponseDto = {};

    // Parallelly query replies and discussion
    await Promise.all([
      // Query replies
      (async () => {
        const getRepliesInfo = async (replyEntities: DiscussionReplyEntity[]) => {
          // For parallel
          const [publishers, reactions, permissions] = await Promise.all([
            // publishers
            (async () =>
              Object.fromEntries(
                await Promise.all(
                  (
                    await this.userService.findUsersByExistingIds(replyEntities.map(reply => reply.publisherId))
                  ).map(
                    async user =>
                      [user.id, await this.userService.getUserMeta(user, currentUser)] as [number, UserMetaDto]
                  )
                )
              ))(),
            // reactions
            this.discussionService.getReactions(
              DiscussionReactionType.DiscussionReply,
              replyEntities.map(reply => reply.id),
              currentUser
            ),
            // permissions
            Promise.all(
              replyEntities.map(
                async reply => await this.discussionService.getUserPermissionsOfReply(currentUser, reply, hasPrivilege)
              )
            )
          ]);

          return replyEntities.map((reply, i) => {
            const [reactionsCount, currentUserReactions] = reactions[i];
            return <DiscussionReplyDto>{
              id: reply.id,
              content: reply.content,
              publishTime: reply.publishTime,
              editTime: reply.editTime,
              isPublic: reply.isPublic,
              publisher: publishers[reply.publisherId],
              reactions: {
                count: reactionsCount,
                currentUserReactions
              },
              permissions: permissions[i]
            };
          });
        };

        if (request.queryRepliesType === GetDiscussionAndRepliesRequestQueryRepliesType.HeadTail) {
          const [head, tail, count] = await this.discussionService.queryDiscussionRepliesByHeadTail(
            currentUser,
            discussion,
            hasPrivilege,
            headTakeCount,
            tailTakeCount
          );
          const headCount = head.length;
          const replies = await getRepliesInfo([...head, ...tail]);
          result.repliesHead = replies.slice(0, headCount);
          result.repliesTail = replies.slice(headCount);
          result.repliesTotalCount = count;
        } else if (request.queryRepliesType === GetDiscussionAndRepliesRequestQueryRepliesType.IdRange) {
          const [replyEntities, count] = await this.discussionService.queryDiscussionRepliesInIdRange(
            currentUser,
            discussion,
            hasPrivilege,
            request.beforeId || 0,
            request.afterId || 0,
            idRangeTakeCount
          );
          result.repliesInRange = await getRepliesInfo(replyEntities);
          result.repliesCountInRange = count;
        }
      })(),
      // Query discussion
      (async () => {
        if (request.getDiscussion) {
          result.permissionCreateNewDiscussion = await this.discussionService.userHasCreateDiscussionPermission(
            currentUser,
            hasPrivilege
          );

          // For parallel
          const [meta, content, problem, publisher, reactions, permissions] = await Promise.all([
            // meta
            this.discussionService.getDiscussionMeta(discussion),
            // content
            this.discussionService.getDiscussionContent(discussion),
            // problem
            discussionProblem &&
              (async () => {
                const titleLocale = discussionProblem.locales.includes(request.locale)
                  ? request.locale
                  : discussionProblem.locales[0];
                const title = await this.problemService.getProblemLocalizedTitle(discussionProblem, titleLocale);

                return <GetDiscussionAndRepliesResponseProblemDto>{
                  meta: await this.problemService.getProblemMeta(discussionProblem),
                  title,
                  titleLocale
                };
              })(),
            // publisher
            this.userService
              .findUserById(discussion.publisherId)
              .then(user => this.userService.getUserMeta(user, currentUser)),
            // reactions
            this.discussionService.getReactions(DiscussionReactionType.Discussion, discussion.id, currentUser).then(
              ([reactionsCount, currentUserReactions]) =>
                <DiscussionOrReplyReactionsDto>{
                  count: reactionsCount,
                  currentUserReactions
                }
            ),
            // permissions
            this.discussionService.getUserPermissionsOfDiscussion(currentUser, discussion)
          ]);

          result.discussion = {
            meta,
            content,
            problem,
            publisher,
            reactions,
            permissions
          };
        }
      })()
    ]);

    return result;
  }

  @Post("updateDiscussion")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update the title and content of a existing discussion."
  })
  async updateDiscussion(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateDiscussionRequestDto
  ): Promise<UpdateDiscussionResponseDto> {
    const discussion = await this.discussionService.findDiscussionById(request.discussionId);
    if (!discussion)
      return {
        error: UpdateDiscussionResponseError.NO_SUCH_DISCUSSION
      };

    if (!(await this.discussionService.userHasPermission(currentUser, discussion, DiscussionPermissionType.Modify)))
      return {
        error: UpdateDiscussionResponseError.PERMISSION_DENIED
      };

    const old = {
      title: discussion.title,
      content: await this.discussionService.getDiscussionContent(discussion)
    };

    await this.discussionService.updateDiscussionTitleAndContent(discussion, request.title, request.content);

    await this.auditService.log("discussion.update", AuditLogObjectType.Discussion, discussion.id, {
      old,
      new: {
        title: request.title,
        content: request.content
      }
    });

    return {};
  }

  @Post("updateDiscussionReply")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update the content of a existing discussion reply."
  })
  async updateDiscussionReply(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateDiscussionReplyRequestDto
  ): Promise<UpdateDiscussionReplyResponseDto> {
    const discussionReply = await this.discussionService.findDiscussionReplyById(request.discussionReplyId);
    if (!discussionReply)
      return {
        error: UpdateDiscussionReplyResponseError.NO_SUCH_DISCUSSION_REPLY
      };

    if (!(await this.discussionService.userHasModifyDiscussionReplyPermission(currentUser, discussionReply)))
      return {
        error: UpdateDiscussionReplyResponseError.PERMISSION_DENIED
      };

    const oldContent = discussionReply.content;

    await this.discussionService.updateReplyContent(discussionReply, request.content);

    await this.auditService.log(
      "discussion.update_reply",
      AuditLogObjectType.Discussion,
      discussionReply.discussionId,
      AuditLogObjectType.DiscussionReply,
      discussionReply.id,
      {
        oldContent,
        newContent: request.content
      }
    );

    return {
      editTime: discussionReply.editTime
    };
  }

  @Post("deleteDiscussion")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete a discussion and all its replies."
  })
  async deleteDiscussion(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteDiscussionRequestDto
  ): Promise<DeleteDiscussionResponseDto> {
    const discussion = await this.discussionService.findDiscussionById(request.discussionId);
    if (!discussion)
      return {
        error: DeleteDiscussionResponseError.NO_SUCH_DISCUSSION
      };

    if (!(await this.discussionService.userHasPermission(currentUser, discussion, DiscussionPermissionType.Delete)))
      return {
        error: DeleteDiscussionResponseError.PERMISSION_DENIED
      };

    // Lock the discussion after permission check to avoid DDoS attacks.
    return await this.discussionService.lockDiscussionById<DeleteDiscussionResponseDto>(
      request.discussionId,
      "Write",
      // eslint-disable-next-line @typescript-eslint/no-shadow
      async discussion => {
        if (!discussion)
          return {
            error: DeleteDiscussionResponseError.NO_SUCH_DISCUSSION
          };

        const content = await this.discussionService.getDiscussionContent(discussion);

        await this.discussionService.deleteDiscussion(discussion);

        await this.auditService.log("discussion.delete", AuditLogObjectType.Discussion, discussion.id, {
          title: discussion.title,
          content,
          publishTime: discussion.publishTime,
          replyCount: discussion.replyCount,
          isPublic: discussion.isPublic,
          publisherId: discussion.publisherId,
          problemId: discussion.problemId
        });

        return {};
      }
    );
  }

  @Post("deleteDiscussionReply")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete a discussion reply."
  })
  async deleteDiscussionReply(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteDiscussionReplyRequestDto
  ): Promise<DeleteDiscussionReplyResponseDto> {
    const discussionReply = await this.discussionService.findDiscussionReplyById(request.discussionReplyId);
    if (!discussionReply)
      return {
        error: DeleteDiscussionReplyResponseError.NO_SUCH_DISCUSSION_REPLY
      };

    if (!(await this.discussionService.userHasModifyDiscussionReplyPermission(currentUser, discussionReply)))
      return {
        error: DeleteDiscussionReplyResponseError.PERMISSION_DENIED
      };

    const oldContent = discussionReply.content;

    await this.discussionService.deleteReply(discussionReply);

    await this.auditService.log(
      "discussion.delete_reply",
      AuditLogObjectType.Discussion,
      discussionReply.discussionId,
      AuditLogObjectType.DiscussionReply,
      discussionReply.id,
      {
        content: oldContent
      }
    );

    return {};
  }

  @Post("setDiscussionPublic")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set if a discussion is public."
  })
  async setDiscussionPublic(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetDiscussionPublicRequestDto
  ): Promise<SetDiscussionPublicResponseDto> {
    const discussion = await this.discussionService.findDiscussionById(request.discussionId);
    if (!discussion)
      return {
        error: SetDiscussionPublicResponseError.NO_SUCH_DISCUSSION
      };

    if (
      !(await this.discussionService.userHasPermission(
        currentUser,
        discussion,
        DiscussionPermissionType.ManagePublicness
      ))
    )
      return {
        error: SetDiscussionPublicResponseError.PERMISSION_DENIED
      };

    await this.discussionService.setDiscussionPublic(discussion, request.isPublic);

    await this.auditService.log(
      request.isPublic ? "discussion.set_public" : "discussion.set_non_public",
      AuditLogObjectType.Discussion,
      discussion.id
    );

    return {};
  }

  @Post("setDiscussionReplyPublic")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set if a discussion reply is public."
  })
  async setDiscussionReplyPublic(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetDiscussionReplyPublicRequestDto
  ): Promise<SetDiscussionReplyPublicResponseDto> {
    const discussionReply = await this.discussionService.findDiscussionReplyById(request.discussionReplyId);
    if (!discussionReply)
      return {
        error: SetDiscussionReplyPublicResponseError.NO_SUCH_DISCUSSION_REPLY
      };

    if (
      !(await this.discussionService.userHasPermission(
        currentUser,
        await this.discussionService.findDiscussionById(discussionReply.id),
        DiscussionPermissionType.ManagePublicness
      ))
    )
      return {
        error: SetDiscussionReplyPublicResponseError.PERMISSION_DENIED
      };

    await this.discussionService.setReplyPublic(discussionReply, request.isPublic);

    await this.auditService.log(
      request.isPublic ? "discussion.set_reply_public" : "discussion.set_reply_non_public",
      AuditLogObjectType.Discussion,
      discussionReply.discussionId,
      AuditLogObjectType.DiscussionReply,
      discussionReply.id
    );

    return {};
  }

  @Post("setDiscussionPermissions")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set who and which groups have permission to read / write this discussion."
  })
  async setDiscussionPermissions(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetDiscussionPermissionsRequestDto
  ): Promise<SetDiscussionPermissionsResponseDto> {
    if (!currentUser)
      return {
        error: SetDiscussionPermissionsResponseError.PERMISSION_DENIED
      };

    return await this.discussionService.lockDiscussionById<SetDiscussionPermissionsResponseDto>(
      request.discussionId,
      "Read",
      async discussion => {
        if (!discussion)
          return {
            error: SetDiscussionPermissionsResponseError.NO_SUCH_DISCUSSION,
            errorObjectId: request.discussionId
          };

        if (
          !(await this.discussionService.userHasPermission(
            currentUser,
            discussion,
            DiscussionPermissionType.ManagePermission
          ))
        )
          return {
            error: SetDiscussionPermissionsResponseError.PERMISSION_DENIED
          };

        const users = await this.userService.findUsersByExistingIds(
          request.userPermissions.map(userPermission => userPermission.userId)
        );
        const userPermissions: [UserEntity, DiscussionPermissionLevel][] = [];
        for (const i of request.userPermissions.keys()) {
          const { userId, permissionLevel } = request.userPermissions[i];
          if (!users[i])
            return {
              error: SetDiscussionPermissionsResponseError.NO_SUCH_USER,
              errorObjectId: userId
            };

          userPermissions.push([users[i], permissionLevel]);
        }

        const groups = await this.groupService.findGroupsByExistingIds(
          request.groupPermissions.map(groupPermission => groupPermission.groupId)
        );
        const groupPermissions: [GroupEntity, DiscussionPermissionLevel][] = [];
        for (const i of request.groupPermissions.keys()) {
          const { groupId, permissionLevel } = request.groupPermissions[i];
          if (!groups[i])
            return {
              error: SetDiscussionPermissionsResponseError.NO_SUCH_GROUP,
              errorObjectId: groupId
            };

          groupPermissions.push([groups[i], permissionLevel]);
        }

        const oldPermissions = await this.discussionService.getDiscussionPermissionsWithId(discussion);

        await this.discussionService.setDiscussionPermissions(discussion, userPermissions, groupPermissions);

        await this.auditService.log("discussion.set_permissions", AuditLogObjectType.Discussion, discussion.id, {
          oldPermissions: {
            userPermissions: oldPermissions[0].map(([userId, permissionLevel]) => ({
              userId,
              permissionLevel
            })),
            groupPermissions: oldPermissions[1].map(([groupId, permissionLevel]) => ({
              groupId,
              permissionLevel
            }))
          },
          newPermissions: {
            userPermissions: request.userPermissions,
            groupPermissions: request.groupPermissions
          }
        });

        return {};
      }
    );
  }
}
