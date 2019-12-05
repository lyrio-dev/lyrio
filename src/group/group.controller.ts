import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

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
  SetGroupAdminResponseError
} from "./dto";
import { GroupService } from "./group.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import {
  UserPrivilegeService,
  UserPrivilegeType
} from "@/user/user-privilege.service";

@Controller("group")
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly userPrivilegeService: UserPrivilegeService
  ) {}

  // TODO: Find an elegant way to validate GET's input data
  @Get("getGroupMeta")
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: GetGroupMetaResponseDto,
    description: "Get the metadata of a group by its ID"
  })
  async getGroupMeta(
    @Query() request: GetGroupMetaRequestDto
  ): Promise<GetGroupMetaResponseDto> {
    const group = await this.groupService.findGroupById(
      parseInt(request.groupId)
    );
    if (!group)
      return {
        error: GetGroupMetaResponseError.NO_SUCH_GROUP
      };

    return {
      groupMeta: {
        id: group.id,
        name: group.name,
        ownerId: group.ownerId
      }
    };
  }

  @Post("create")
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: CreateGroupResponseDto,
    description: "Create a new group, return its ID if success"
  })
  async create(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateGroupRequestDto
  ): Promise<CreateGroupResponseDto> {
    if (
      !(
        currentUser &&
        (await this.userPrivilegeService.userHasPrivilege(
          currentUser,
          UserPrivilegeType.MANAGE_USER_GROUP
        ))
      )
    )
      return {
        error: CreateGroupResponseError.PERMISSION_DENIED
      };

    const [error, group] = await this.groupService.createGroup(
      currentUser.id,
      request.groupName
    );
    if (error)
      return {
        error: error
      };

    return {
      groupId: group.id
    };
  }

  @Post("delete")
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: DeleteGroupResponseDto,
    description:
      "Delete a group. To delete a group with user or privilege, use the force option"
  })
  async delete(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteGroupRequestDto
  ): Promise<DeleteGroupResponseDto> {
    if (
      !(
        currentUser &&
        (await this.userPrivilegeService.userHasPrivilege(
          currentUser,
          UserPrivilegeType.MANAGE_USER_GROUP
        ))
      )
    )
      return {
        error: DeleteGroupResponseError.PERMISSION_DENIED
      };

    // TODO: Check permission

    const error = await this.groupService.deleteGroup(
      request.groupId,
      request.force
    );
    if (error)
      return {
        error: error
      };

    return {};
  }

  @Post("addMember")
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: AddUserToGroupResponseDto,
    description: "Add a user to a group"
  })
  async addMember(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: AddUserToGroupRequestDto
  ): Promise<AddUserToGroupResponseDto> {
    if (!currentUser)
      return {
        error: AddUserToGroupResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(
      request.groupId
    );
    if (!group)
      return {
        error: AddUserToGroupResponseError.NO_SUCH_GROUP
      };

    if (
      !(
        currentUser.id === group.ownerId ||
        (await this.userPrivilegeService.userHasPrivilege(
          currentUser,
          UserPrivilegeType.MANAGE_USER_GROUP
        )) ||
        (await this.groupService.isGroupAdmin(currentUser.id, group.id))
      )
    )
      return {
        error: AddUserToGroupResponseError.PERMISSION_DENIED
      };

    const error = await this.groupService.addUserToGroup(
      request.userId,
      group
    );
    if (error)
      return {
        error: error
      };

    return {};
  }

  @Post("removeMember")
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: RemoveUserFromGroupResponseDto,
    description: "Remove a user from a group"
  })
  async removeMember(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RemoveUserFromGroupRequestDto
  ): Promise<RemoveUserFromGroupResponseDto> {
    if (!currentUser)
      return {
        error: RemoveUserFromGroupResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(
      request.groupId
    );
    if (!group)
      return {
        error: RemoveUserFromGroupResponseError.NO_SUCH_GROUP
      };

    if (
      !(
        currentUser.id === group.ownerId ||
        (await this.userPrivilegeService.userHasPrivilege(
          currentUser,
          UserPrivilegeType.MANAGE_USER_GROUP
        )) ||
        (await this.groupService.isGroupAdmin(currentUser.id, group.id))
      )
    )
      return {
        error: RemoveUserFromGroupResponseError.PERMISSION_DENIED
      };

    const error = await this.groupService.removeUserFromGroup(
      request.userId,
      group
    );
    if (error)
      return {
        error: error
      };

    return {};
  }

  @Post("setGroupAdmin")
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: SetGroupAdminResponseDto,
    description: "Set if or not a member of a group is group admin"
  })
  async setGroupAdmin(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetGroupAdminRequestDto
  ): Promise<SetGroupAdminResponseDto> {
    if (!currentUser)
      return {
        error: SetGroupAdminResponseError.PERMISSION_DENIED
      };

    const group = await this.groupService.findGroupById(
      request.groupId
    );
    if (!group)
      return {
        error: SetGroupAdminResponseError.NO_SUCH_GROUP
      };

    if (
      !(
        currentUser.id === group.ownerId ||
        (await this.userPrivilegeService.userHasPrivilege(
          currentUser,
          UserPrivilegeType.MANAGE_USER_GROUP
        ))
      )
    )
      return {
        error: SetGroupAdminResponseError.PERMISSION_DENIED
      };

    const error = await this.groupService.setIsGroupAdmin(
      request.userId,
      request.groupId,
      request.isGroupAdmin
    );
    if (error)
      return {
        error: error
      };

    return {};
  }
}
