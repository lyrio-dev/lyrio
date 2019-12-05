import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "./user.entity";
import { UserService } from "./user.service";
import { UserPrivilegeService } from "./user-privilege.service";
import {
  UserGetUserMetaResponseDto,
  UserGetUserMetaRequestDto,
  UserSetUserPrivilegesResponseDto,
  UserSetUserPrivilegesRequestDto
} from "./dto";

@Controller("user")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userPrivilegeService: UserPrivilegeService
  ) {}

  @Get("getUserMeta")
  @ApiResponse({
    status: 200,
    type: UserGetUserMetaResponseDto,
    description: "Get a user's metadata with its ID or username"
  })
  async getUserMeta(
    @Query() request: UserGetUserMetaRequestDto
  ): Promise<UserGetUserMetaResponseDto> {
    let user: UserEntity;
    if (request.userId) {
      user = await this.userService.findUserById(
        parseInt(request.userId)
      );
    } else if (request.username) {
      user = await this.userService.findUserByUsername(
        request.username
      );
    }

    if (!user) return {};

    const result: UserGetUserMetaResponseDto = {
      userMeta: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        isAdmin: user.isAdmin
      }
    };

    if (request.getPrivileges) {
      result.privileges = await this.userPrivilegeService.getUserPrivileges(
        user.id
      );
    }

    return result;
  }

  @Post("setUserPrivileges")
  @ApiResponse({
    status: 200,
    type: UserSetUserPrivilegesResponseDto,
    description: "Set a user's privileges"
  })
  async setUserPrivileges(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UserSetUserPrivilegesRequestDto
  ): Promise<UserSetUserPrivilegesResponseDto> {
    // TODO: Check permission

    return {
      error: await this.userPrivilegeService.setUserPrivileges(
        request.userId,
        request.privileges
      )
    };
  }
}
