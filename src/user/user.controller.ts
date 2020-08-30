import { Controller, Get, Post, Body, Query, Inject, forwardRef } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { AuthService } from "@/auth/auth.service";
import { ConfigService } from "@/config/config.service";
import { SubmissionService } from "@/submission/submission.service";
import { AuditLogObjectType, AuditService } from "@/audit/audit.service";

import { UserEntity } from "./user.entity";
import { UserService } from "./user.service";
import { UserPrivilegeService } from "./user-privilege.service";
import { UserPrivilegeType } from "./user-privilege.entity";

import {
  GetUserMetaResponseDto,
  GetUserMetaRequestDto,
  GetUserMetaResponseError,
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
  GetUserDetailResponseError,
  GetUserProfileRequestDto,
  GetUserProfileResponseDto,
  GetUserProfileResponseError,
  GetUserPreferenceRequestDto,
  GetUserPreferenceResponseDto,
  GetUserPreferenceResponseError,
  UpdateUserPreferenceRequestDto,
  UpdateUserPreferenceResponseDto,
  UpdateUserPreferenceResponseError,
  GetUserSecuritySettingsRequestDto,
  GetUserSecuritySettingsResponseDto,
  GetUserSecuritySettingsResponseError,
  UpdateUserPasswordRequestDto,
  UpdateUserPasswordResponseDto,
  UpdateUserPasswordResponseError,
  UpdateUserSelfEmailRequestDto,
  UpdateUserSelfEmailResponseDto,
  UpdateUserSelfEmailResponseError
} from "./dto";

@ApiTags("User")
@Controller("user")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly userPrivilegeService: UserPrivilegeService,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly auditService: AuditService
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

  @Post("getUserMeta")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user's metadata with its ID or username."
  })
  async getUserMeta(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetUserMetaRequestDto
  ): Promise<GetUserMetaResponseDto> {
    let user: UserEntity;
    if (request.userId) {
      user = await this.userService.findUserById(request.userId);
    } else if (request.username) {
      user = await this.userService.findUserByUsername(request.username);
    }

    if (!user)
      return {
        error: GetUserMetaResponseError.NO_SUCH_USER
      };

    const result: GetUserMetaResponseDto = {
      meta: await this.userService.getUserMeta(user, currentUser)
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

    const oldPrivileges = await this.userPrivilegeService.getUserPrivileges(request.userId);

    const error = await this.userPrivilegeService.setUserPrivileges(request.userId, request.privileges);

    await this.auditService.log("user.set_privileges", AuditLogObjectType.User, request.userId, {
      oldPrivileges,
      newPrivileges: request.privileges
    });

    return {
      error
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
    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER);

    if (!(isUserSelf || hasPrivilege))
      return {
        error: UpdateUserProfileResponseError.PERMISSION_DENIED
      };

    if (request.username) {
      if (!this.configService.config.preference.allowUserChangeUsername) {
        // Normal users are not allowed to change their usernames
        if (!hasPrivilege)
          return {
            error: UpdateUserProfileResponseError.PERMISSION_DENIED
          };
      }
    }

    // if (request.password) {
    //   // A non-admin user must give the old password to change its password
    //   if (!hasPrivilege) {
    //     const userAuth = await this.authService.findUserAuthByUserId(request.userId);
    //     if (!(await this.authService.checkPassword(userAuth, request.oldPassword)))
    //       return {
    //         error: UpdateUserProfileResponseError.WRONG_OLD_PASSWORD
    //       };
    //   }
    // }

    const oldUsername = user.username;
    const oldEmail = user.email;

    const error = await this.userService.updateUserProfile(
      user,
      request.username,
      request.email,
      request.publicEmail,
      request.avatarInfo,
      request.bio,
      request.information
    );

    if (oldUsername !== request.username) {
      if (user.id === currentUser.id) {
        await this.auditService.log("user.change_username", {
          oldUsername,
          newUsername: request.username
        });
      } else {
        await this.auditService.log("user.change_others_username", AuditLogObjectType.User, user.id, {
          oldUsername,
          newUsername: request.username
        });
      }
    }

    if (oldEmail !== request.email) {
      if (user.id === currentUser.id) {
        await this.auditService.log("user.change_email", {
          oldEmail,
          newEmail: request.email
        });
      } else {
        await this.auditService.log("user.change_others_email", AuditLogObjectType.User, user.id, {
          oldEmail,
          newEmail: request.email
        });
      }
    }

    return {
      error
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
      count
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
        organization: userInformation.organization,
        location: userInformation.location,
        url: userInformation.url,
        telegram: userInformation.telegram,
        qq: userInformation.qq,
        github: userInformation.github
      },
      submissionCountPerDay,
      rank: await this.userService.getUserRank(user),
      hasPrivilege:
        currentUser &&
        (currentUser.id === user.id ||
          (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER)))
    };
  }

  @Post("getUserProfile")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user's meta and information for user profile edit page."
  })
  async getUserProfile(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetUserProfileRequestDto
  ): Promise<GetUserProfileResponseDto> {
    if (!currentUser)
      return {
        error: GetUserProfileResponseError.PERMISSION_DENIED
      };

    const user = await this.userService.findUserById(request.userId);
    if (!user)
      return {
        error: GetUserProfileResponseError.NO_SUCH_USER
      };

    if (
      currentUser.id !== user.id &&
      !(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER))
    )
      return {
        error: GetUserProfileResponseError.PERMISSION_DENIED
      };

    const userInformation = await this.userService.findUserInformationByUserId(user.id);

    return {
      meta: await this.userService.getUserMeta(user, currentUser),
      publicEmail: user.publicEmail,
      avatarInfo: user.avatarInfo,
      information: {
        organization: userInformation.organization,
        location: userInformation.location,
        url: userInformation.url,
        telegram: userInformation.telegram,
        qq: userInformation.qq,
        github: userInformation.github
      }
    };
  }

  @Post("getUserPreference")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user's meta and preference for user profile edit page."
  })
  async getUserPreference(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetUserPreferenceRequestDto
  ): Promise<GetUserPreferenceResponseDto> {
    if (!currentUser)
      return {
        error: GetUserPreferenceResponseError.PERMISSION_DENIED
      };

    const user = await this.userService.findUserById(request.userId);
    if (!user)
      return {
        error: GetUserPreferenceResponseError.NO_SUCH_USER
      };

    if (
      currentUser.id !== user.id &&
      !(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER))
    )
      return {
        error: GetUserPreferenceResponseError.PERMISSION_DENIED
      };

    return {
      meta: await this.userService.getUserMeta(user, currentUser),
      preference: await this.userService.getUserPreference(user)
    };
  }

  @Post("updateUserPreference")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update a user's preference."
  })
  async updateUserPreference(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateUserPreferenceRequestDto
  ): Promise<UpdateUserPreferenceResponseDto> {
    if (!currentUser)
      return {
        error: UpdateUserPreferenceResponseError.PERMISSION_DENIED
      };

    const user = await this.userService.findUserById(request.userId);
    if (!user)
      return {
        error: UpdateUserPreferenceResponseError.NO_SUCH_USER
      };

    if (
      currentUser.id !== user.id &&
      !(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER))
    )
      return {
        error: UpdateUserPreferenceResponseError.PERMISSION_DENIED
      };

    await this.userService.updateUserPreference(user, request.preference);

    return {};
  }

  @Post("getUserSecuritySettings")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user's security settings for user settings page."
  })
  async getUserSecuritySettings(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetUserSecuritySettingsRequestDto
  ): Promise<GetUserSecuritySettingsResponseDto> {
    if (!currentUser)
      return {
        error: GetUserSecuritySettingsResponseError.PERMISSION_DENIED
      };

    const user = await this.userService.findUserById(request.userId);
    if (!user)
      return {
        error: GetUserSecuritySettingsResponseError.NO_SUCH_USER
      };

    if (
      currentUser.id !== user.id &&
      !(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER))
    )
      return {
        error: GetUserSecuritySettingsResponseError.PERMISSION_DENIED
      };

    return {
      meta: await this.userService.getUserMeta(user, currentUser)
    };
  }

  @Post("updateUserPassword")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Change a user's password by its old password."
  })
  async updateUserPassword(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateUserPasswordRequestDto
  ): Promise<UpdateUserPasswordResponseDto> {
    const user = await this.userService.findUserById(request.userId);
    if (!user)
      return {
        error: UpdateUserPasswordResponseError.NO_SUCH_USER
      };

    if (!currentUser)
      return {
        error: UpdateUserPasswordResponseError.PERMISSION_DENIED
      };

    const isUserSelf = currentUser.id === user.id;
    const hasPrivilege = await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER);

    if (!(isUserSelf || hasPrivilege))
      return {
        error: UpdateUserPasswordResponseError.PERMISSION_DENIED
      };

    // A non-admin user must give the old password to change its password
    const userAuth = await this.authService.findUserAuthByUserId(request.userId);
    if (!hasPrivilege) {
      if (!(await this.authService.checkPassword(userAuth, request.oldPassword)))
        return {
          error: UpdateUserPasswordResponseError.WRONG_OLD_PASSWORD
        };
    }

    await this.authService.changePassword(userAuth, request.password);

    if (request.userId === user.id) {
      await this.auditService.log("auth.change_password");
    } else {
      await this.auditService.log("auth.change_others_password", AuditLogObjectType.User, user.id);
    }

    return {};
  }

  @Post("updateUserSelfEmail")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Change the current user itself's email."
  })
  async updateUserSelfEmail(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateUserSelfEmailRequestDto
  ): Promise<UpdateUserSelfEmailResponseDto> {
    if (!currentUser)
      return {
        error: UpdateUserSelfEmailResponseError.PERMISSION_DENIED
      };

    const oldEmail = currentUser.email;

    const error = await this.userService.updateUserSelfEmail(currentUser, request.email, request.emailVerificationCode);

    if (oldEmail !== request.email) {
      await this.auditService.log("auth.change_email", {
        oldEmail,
        newEmail: request.email
      });
    }

    if (!error) return {};
    return {
      error
    };
  }
}
