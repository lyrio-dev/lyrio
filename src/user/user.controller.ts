import { Controller, Get, Post, Body, Query, Inject, forwardRef } from "@nestjs/common";
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
  SearchUserResponseDto,
  GetUserListRequestDto,
  GetUserListResponseDto,
  GetUserListResponseError,
  GetUserDetailRequestDto,
  GetUserDetailResponseDto,
  GetUserDetailResponseError
} from "./dto";
import { UserPrivilegeType } from "./user-privilege.entity";
import { AuthService } from "@/auth/auth.service";
import { ConfigService } from "@/config/config.service";
import { SubmissionService } from "@/submission/submission.service";

@ApiTags("User")
@Controller("user")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly userPrivilegeService: UserPrivilegeService,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService
  ) {}

  @Get("searchUser")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Search users with a substring of the username"
  })
  async searchUser(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: SearchUserRequestDto
  ): Promise<SearchUserResponseDto> {
    const users = await this.userService.searchUser(
      request.query,
      request.wildcard,
      this.configService.config.queryLimit.searchUserTake
    );

    return {
      userMetas: await Promise.all(users.map(async user => await this.userService.getUserMeta(user, currentUser)))
    };
  }

  @Get("getUserMeta")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user's metadata with its ID or username."
  })
  async getUserMeta(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: GetUserMetaRequestDto
  ): Promise<GetUserMetaResponseDto> {
    let user: UserEntity;
    if (request.userId) {
      user = await this.userService.findUserById(parseInt(request.userId));
    } else if (request.username) {
      user = await this.userService.findUserByUsername(request.username);
    }

    if (!user) return {};

    const result: GetUserMetaResponseDto = {
      userMeta: await this.userService.getUserMeta(user, currentUser)
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
        request.publicEmail,
        request.bio,
        request.password,
        request.information
      )
    };
  }

  @Post("getUserList")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user list sorted by rating or accepted problems count."
  })
  async getUserList(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetUserListRequestDto
  ): Promise<GetUserListResponseDto> {
    if (request.takeCount > this.configService.config.queryLimit.userListUsersTake)
      return {
        error: GetUserListResponseError.TAKE_TOO_MANY
      };

    const [users, count] = await this.userService.getUserList(request.sortBy, request.skipCount, request.takeCount);

    return {
      userMetas: await Promise.all(users.map(user => this.userService.getUserMeta(user, currentUser))),
      count: count
    };
  }

  @Post("getUserDetail")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user's meta and related data for user profile page."
  })
  async getUserDetail(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetUserDetailRequestDto
  ): Promise<GetUserDetailResponseDto> {
    const user = await this.userService.findUserById(request.userId);
    if (!user)
      return {
        error: GetUserDetailResponseError.NO_SUCH_USER
      };

    const userInformation = await this.userService.findUserInformationByUserId(user.id);

    const days = 53 * 7 + 6;
    const submissionCountPerDay = await this.submissionService.getUserRecentlySubmissionCountPerDay(
      user,
      days,
      request.timezone,
      request.now
    );

    return {
      meta: await this.userService.getUserMeta(user, currentUser),
      information: {
        sexIsFamale: userInformation.sexIsFamale,
        organization: userInformation.organization,
        location: userInformation.location,
        url: userInformation.url,
        telegram: userInformation.telegram,
        qq: userInformation.qq,
        github: userInformation.github
      },
      submissionCountPerDay: submissionCountPerDay,
      rank: await this.userService.getUserRank(user),
      hasPrivilege:
        currentUser &&
        (currentUser.id === user.id ||
          (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER)))
    };
  }
}
