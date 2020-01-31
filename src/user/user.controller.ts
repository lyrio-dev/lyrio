import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "./user.entity";
import { UserService } from "./user.service";
import { UserPrivilegeService } from "./user-privilege.service";
import {
  GetUserMetaResponseDto,
  GetUserMetaRequestDto,
  SetUserPrivilegesResponseDto,
  SetUserPrivilegesRequestDto,
  SetUserPrivilegesResponseError,
  UpdateUserProfileRequestDto,
  UpdateUserProfileResponseDto,
  UpdateUserProfileResponseError,
  SearchUserRequestDto,
  SearchUserResponseDto
} from "./dto";
import { UserPrivilegeType } from "./user-privilege.entity";
import { AuthService } from "@/auth/auth.service";
import { ConfigService } from "@/config/config.service";

@ApiTags("User")
@Controller("user")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly userPrivilegeService: UserPrivilegeService
  ) {}

  @Get("searchUser")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Search users with a substring of the username"
  })
  async searchUser(@Query() request: SearchUserRequestDto): Promise<SearchUserResponseDto> {
    const users = await this.userService.searchUser(request.query, this.configService.config.queryLimit.searchUserTake);
    return {
      userMetas: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        isAdmin: user.isAdmin
      }))
    };
  }

  @Get("getUserMeta")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user's metadata with its ID or username."
  })
  async getUserMeta(@Query() request: GetUserMetaRequestDto): Promise<GetUserMetaResponseDto> {
    let user: UserEntity;
    if (request.userId) {
      user = await this.userService.findUserById(parseInt(request.userId));
    } else if (request.username) {
      user = await this.userService.findUserByUsername(request.username);
    }

    if (!user) return {};

    const result: GetUserMetaResponseDto = {
      userMeta: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        isAdmin: user.isAdmin
      }
    };

    if (request.getPrivileges) {
      result.privileges = await this.userPrivilegeService.getUserPrivileges(user.id);
    }

    return result;
  }

  @Post("setUserPrivileges")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set a user's privileges."
  })
  async setUserPrivileges(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetUserPrivilegesRequestDto
  ): Promise<SetUserPrivilegesResponseDto> {
    if (!(currentUser && currentUser.isAdmin))
      return {
        error: SetUserPrivilegesResponseError.PERMISSION_DENIED
      };

    return {
      error: await this.userPrivilegeService.setUserPrivileges(request.userId, request.privileges)
    };
  }

  @Post("updateUserProfile")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update a user's username, email, bio or password."
  })
  async updateUserProfile(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateUserProfileRequestDto
  ): Promise<UpdateUserProfileResponseDto> {
    const user = await this.userService.findUserById(request.userId);
    if (!user)
      return {
        error: UpdateUserProfileResponseError.NO_SUCH_USER
      };

    if (!currentUser)
      return {
        error: UpdateUserProfileResponseError.PERMISSION_DENIED
      };

    const isUserSelf = currentUser.id === user.id;
    const isAdmin =
      user.isAdmin || (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER));

    if (!(isUserSelf || isAdmin))
      return {
        error: UpdateUserProfileResponseError.PERMISSION_DENIED
      };

    if (request.username) {
      if (!this.configService.config.preference.allowUserChangeUsername) {
        // Normal users are not allowed to change their usernames
        if (!isAdmin)
          return {
            error: UpdateUserProfileResponseError.PERMISSION_DENIED
          };
      }
    }

    if (request.password) {
      // A non-admin user must give the old password to change its password
      if (!isAdmin) {
        const userAuth = await this.authService.findUserAuthByUserId(request.userId);
        if (!(await this.authService.checkPassword(userAuth, request.oldPassword)))
          return {
            error: UpdateUserProfileResponseError.WRONG_OLD_PASSWORD
          };
      }
    }

    return {
      error: await this.userService.updateUserProfile(
        user,
        request.username,
        request.email,
        request.bio,
        request.password
      )
    };
  }
}
