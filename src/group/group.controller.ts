import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ConfigService } from "@/config/config.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { UserService } from "@/user/user.service";
import { AuditLogObjectType, AuditService } from "@/audit/audit.service";

import { GroupService } from "./group.service";

import {
  GetGroupMetaRequestDto,
  GetGroupMetaResponseDto,
  GetGroupMetaResponseError,
  CreateGroupRequestDto,
  CreateGroupResponseDto,
  CreateGroupResponseError,
  DeleteGroupRequestDto,
  DeleteGroupResponseDto,
  DeleteGroupResponseError,
  AddUserToGroupRequestDto,
  AddUserToGroupResponseDto,
  AddUserToGroupResponseError,
  RemoveUserFromGroupRequestDto,
  RemoveUserFromGroupResponseDto,
  RemoveUserFromGroupResponseError,
  SetGroupAdminRequestDto,
  SetGroupAdminResponseDto,
  SetGroupAdminResponseError,
  SearchGroupRequestDto,
  SearchGroupResponseDto,
  GetGroupListResponseDto,
  GetGroupMemberListRequestDto,
  GetGroupMemberListResponseDto,
  GetGroupMemberListResponseError,
  RenameGroupRequestDto,
  RenameGroupResponseDto,
  RenameGroupResponseError
} from "./dto";

@ApiTags("Group")
@Controller("group")
export class GroupController {
  constructor(
    private readonly configService: ConfigService,
    private readonly groupService: GroupService,
    private readonly userService: UserService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly auditService: AuditService
  ) {}

  // TODO: Find an elegant way to validate GET's input data
  @Get("getGroupMeta")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the metadata of a group by its ID."
  })
  async getGroupMeta(@Query() request: GetGroupMetaRequestDto): Promise<GetGroupMetaResponseDto> {
    const group = await this.groupService.findGroupById(Number(request.groupId));
    if (!group)
      return {
        error: GetGroupMetaResponseError.NO_SUCH_GROUP
      };

    return {
      groupMeta: await this.groupService.getGroupMeta(group)
    };
  }

  @Get("searchGroup")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Search group with a substring of the group name"
  })
  async searchGroup(@Query() request: SearchGroupRequestDto): Promise<SearchGroupResponseDto> {
    const groups = await this.groupService.searchGroup(
      request.query,
      request.wildcard,
      this.configService.config.queryLimit.searchGroup
    );
    return {
      groupMetas: await Promise.all(groups.map(async group => await this.groupService.getGroupMeta(group)))
    };
  }

  @Post("createGroup")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a new group."
  })
  async createGroup(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateGroupRequestDto
  ): Promise<CreateGroupResponseDto> {
    if (
      !(
        currentUser &&
        (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageUserGroup))
      )
    )
      return {
        error: CreateGroupResponseError.PERMISSION_DENIED
      };

    const [error, group] = await this.groupService.createGroup(request.groupName);
    if (error)
      return {
        error
      };

    await this.auditService.log("group.create", AuditLogObjectType.Group, group.id, {
      groupName: request.groupName
    });

    return {
      groupId: group.id
    };
  }

  @Post("deleteGroup")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete a group.",
    description: "To delete a group with user or privilege, use the force option."
  })
  async deleteGroup(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteGroupRequestDto
  ): Promise<DeleteGroupResponseDto> {
    if (
      !(
        currentUser &&
        (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageUserGroup))
      )
    )
      return {
        error: DeleteGroupResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(request.groupId);
    if (!group)
      return {
        error: DeleteGroupResponseError.NO_SUCH_GROUP
      };

    await this.groupService.deleteGroup(group);

    await this.auditService.log("group.delete", AuditLogObjectType.Group, group.id, {
      groupName: group.name
    });

    return {};
  }

  @Post("renameGroup")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Rename a existing group."
  })
  async renameGroup(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RenameGroupRequestDto
  ): Promise<RenameGroupResponseDto> {
    if (
      !(
        currentUser &&
        (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageUserGroup))
      )
    )
      return {
        error: RenameGroupResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(request.groupId);
    if (!group)
      return {
        error: RenameGroupResponseError.NO_SUCH_GROUP
      };

    const oldName = group.name;
    if (oldName === request.name) return {};

    const success = await this.groupService.renameGroup(group, request.name);

    if (!success)
      return {
        error: RenameGroupResponseError.DUPLICATE_GROUP_NAME
      };

    await this.auditService.log("group.rename", AuditLogObjectType.Group, group.id, {
      oldName,
      newName: request.name
    });

    return {};
  }

  @Post("addMember")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Add a user to a group."
  })
  async addMember(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: AddUserToGroupRequestDto
  ): Promise<AddUserToGroupResponseDto> {
    if (!currentUser)
      return {
        error: AddUserToGroupResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(request.groupId);
    if (!group)
      return {
        error: AddUserToGroupResponseError.NO_SUCH_GROUP
      };

    if (
      !(
        (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageUserGroup)) ||
        (await this.groupService.isGroupAdmin(currentUser.id, group.id))
      )
    )
      return {
        error: AddUserToGroupResponseError.PERMISSION_DENIED
      };

    const error = await this.groupService.addUserToGroup(request.userId, group);
    if (error)
      return {
        error
      };

    await this.auditService.log(
      "group.add_member",
      AuditLogObjectType.Group,
      group.id,
      AuditLogObjectType.User,
      request.userId
    );

    return {};
  }

  @Post("removeMember")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Remove a user from a group."
  })
  async removeMember(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RemoveUserFromGroupRequestDto
  ): Promise<RemoveUserFromGroupResponseDto> {
    if (!currentUser)
      return {
        error: RemoveUserFromGroupResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(request.groupId);
    if (!group)
      return {
        error: RemoveUserFromGroupResponseError.NO_SUCH_GROUP
      };

    if (
      !(
        (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageUserGroup)) ||
        (await this.groupService.isGroupAdmin(currentUser.id, group.id))
      )
    )
      return {
        error: RemoveUserFromGroupResponseError.PERMISSION_DENIED
      };

    const error = await this.groupService.removeUserFromGroup(request.userId, group);
    if (error)
      return {
        error
      };

    await this.auditService.log(
      "group.remove_member",
      AuditLogObjectType.Group,
      group.id,
      AuditLogObjectType.User,
      request.userId
    );

    return {};
  }

  @Post("setGroupAdmin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set if or not a member of a group is group admin."
  })
  async setGroupAdmin(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetGroupAdminRequestDto
  ): Promise<SetGroupAdminResponseDto> {
    if (!currentUser)
      return {
        error: SetGroupAdminResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(request.groupId);
    if (!group)
      return {
        error: SetGroupAdminResponseError.NO_SUCH_GROUP
      };

    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageUserGroup)))
      return {
        error: SetGroupAdminResponseError.PERMISSION_DENIED
      };

    const error = await this.groupService.setIsGroupAdmin(request.userId, request.groupId, request.isGroupAdmin);
    if (error)
      return {
        error
      };

    await this.auditService.log(
      request.isGroupAdmin ? "group.grant_admin" : "group.revoke_admin",
      AuditLogObjectType.Group,
      group.id,
      AuditLogObjectType.User,
      request.userId
    );

    return {};
  }

  @Get("getGroupList")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get groups joined by current user, or all groups if the user has manage group privilege."
  })
  async getGroupList(@CurrentUser() currentUser: UserEntity): Promise<GetGroupListResponseDto> {
    if (!currentUser)
      return {
        groups: [],
        groupsWithAdminPermission: []
      };

    if (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageUserGroup)) {
      const groups = await this.groupService.getAllGroups();
      return {
        groups: await Promise.all(groups.map(async group => await this.groupService.getGroupMeta(group))),
        groupsWithAdminPermission: groups.map(group => group.id)
      };
    }
    const [groups, groupsWithAdminPermission] = await this.groupService.getUserJoinedGroups(currentUser);
    return {
      groups: await Promise.all(groups.map(async group => await this.groupService.getGroupMeta(group))),
      groupsWithAdminPermission
    };
  }

  @Post("getGroupMemberList")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get list of members of a group."
  })
  async getGroupMemberList(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetGroupMemberListRequestDto
  ): Promise<GetGroupMemberListResponseDto> {
    if (!currentUser)
      return {
        error: GetGroupMemberListResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(request.groupId);
    if (!group)
      return {
        error: GetGroupMemberListResponseError.NO_SUCH_GROUP
      };

    const memberships = await this.groupService.getGroupMemberList(group);
    if (!memberships.some(membership => membership.userId === currentUser.id)) {
      if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.ManageUserGroup))) {
        return {
          error: GetGroupMemberListResponseError.PERMISSION_DENIED
        };
      }
    }

    const users = await this.userService.findUsersByExistingIds(memberships.map(membership => membership.userId));
    return {
      memberList: await Promise.all(
        memberships.map(async (membership, i) => ({
          userMeta: await this.userService.getUserMeta(users[i], currentUser),
          isGroupAdmin: membership.isGroupAdmin
        }))
      )
    };
  }
}
