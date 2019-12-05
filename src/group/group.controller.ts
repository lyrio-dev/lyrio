import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";

import {
  GetGroupMetaRequestDto,
  GetGroupMetaResponseDto,
  CreateGroupResponseDto,
  CreateGroupResponseError,
  CreateGroupRequestDto,
  DeleteGroupResponseDto,
  DeleteGroupRequestDto,
  DeleteGroupResponseError,
  AddUserToGroupRequestDto,
  AddUserToGroupResponseError,
  AddUserToGroupResponseDto,
  RemoveUserFromGroupRequestDto,
  RemoveUserFromGroupResponseDto,
  RemoveUserFromGroupResponseError,
  GetGroupMetaResponseError
} from "./dto";
import { GroupService } from "./group.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";

@Controller("group")
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  // TODO: Find an elegant way to validate GET's input data
  @Get("getGroupMeta")
  @ApiResponse({
    status: 200,
    type: GetGroupMetaResponseDto,
    description: "Get the metadata of a group by its ID"
  })
  async getGroupMeta(
    @Query() getGroupMetaRequestDto: GetGroupMetaRequestDto
  ): Promise<GetGroupMetaResponseDto> {
    const group = await this.groupService.findGroupById(
      parseInt(getGroupMetaRequestDto.groupId)
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
  @ApiResponse({
    status: 200,
    type: CreateGroupResponseDto,
    description: "Create a new group, return its ID if success"
  })
  async create(
    @CurrentUser() currentUser: UserEntity,
    @Body() createGroupRequestDto: CreateGroupRequestDto
  ): Promise<CreateGroupResponseDto> {
    if (!currentUser)
      return {
        error: CreateGroupResponseError.PERMISSION_DENIED
      };

    // TODO: Check permission

    const [error, group] = await this.groupService.createGroup(
      currentUser.id,
      createGroupRequestDto.groupName
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
  @ApiResponse({
    status: 200,
    type: DeleteGroupResponseDto,
    description:
      "Delete a group. To delete a group with user or privilege, use the force option"
  })
  async delete(
    @CurrentUser() currentUser: UserEntity,
    @Body() deleteGroupRequestDto: DeleteGroupRequestDto
  ): Promise<DeleteGroupResponseDto> {
    if (!currentUser)
      return {
        error: DeleteGroupResponseError.PERMISSION_DENIED
      };

    // TODO: Check permission

    const error = await this.groupService.deleteGroup(
      deleteGroupRequestDto.groupId,
      deleteGroupRequestDto.force
    );
    if (error)
      return {
        error: error
      };

    return {};
  }

  @Post("addMember")
  @ApiResponse({
    status: 200,
    type: AddUserToGroupResponseDto,
    description: "Add a user to a group"
  })
  async addMember(
    @CurrentUser() currentUser: UserEntity,
    @Body() addUserToGroupRequestDto: AddUserToGroupRequestDto
  ): Promise<AddUserToGroupResponseDto> {
    if (!currentUser)
      return {
        error: AddUserToGroupResponseError.PERMISSION_DENIED
      };

    // TODO: Check permission

    const error = await this.groupService.addUserToGroup(
      addUserToGroupRequestDto.userId,
      addUserToGroupRequestDto.groupId
    );
    if (error)
      return {
        error: error
      };

    return {};
  }

  @Post("removeMember")
  @ApiResponse({
    status: 200,
    type: RemoveUserFromGroupResponseDto,
    description: "Remove a user from a group"
  })
  async removeMember(
    @CurrentUser() currentUser: UserEntity,
    @Body() removeUserFromGroupRequestDto: RemoveUserFromGroupRequestDto
  ): Promise<RemoveUserFromGroupResponseDto> {
    if (!currentUser)
      return {
        error: RemoveUserFromGroupResponseError.PERMISSION_DENIED
      };

    // TODO: Check permission

    const error = await this.groupService.removeUserFromGroup(
      removeUserFromGroupRequestDto.userId,
      removeUserFromGroupRequestDto.groupId
    );
    if (error)
      return {
        error: error
      };

    return {};
  }
}
