import { Controller, Get, Post, Body, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ConfigService } from "@/config/config.service";
import { UserService } from "@/user/user.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { MailService, MailTemplate } from "@/mail/mail.service";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { GroupService } from "@/group/group.service";
import { AuditLogObjectType, AuditService } from "@/audit/audit.service";

import { AuthEmailVerifactionCodeService, EmailVerifactionCodeType } from "./auth-email-verifaction-code.service";
import { AuthSessionService } from "./auth-session.service";
import { AuthIpLocationService } from "./auth-ip-location.service";
import { RequestWithSession } from "./auth.middleware";
import { AuthService } from "./auth.service";

import {
  LoginRequestDto,
  RegisterRequestDto,
  LoginResponseDto,
  LoginResponseError,
  CheckAvailabilityRequestDto,
  CheckAvailabilityResponseDto,
  SendEmailVerificationCodeRequestDto,
  SendEmailVerificationCodeResponseDto,
  SendEmailVerificationCodeResponseError,
  RegisterResponseDto,
  RegisterResponseError,
  GetSessionInfoRequestDto,
  GetSessionInfoResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  ResetPasswordResponseError,
  ListUserSessionsRequestDto,
  ListUserSessionsResponseDto,
  ListUserSessionsResponseError,
  RevokeUserSessionRequestDto,
  RevokeUserSessionResponseDto,
  RevokeUserSessionResponseError
} from "./dto";

// Refer to auth.middleware.ts for req.session

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly authService: AuthService,
    private readonly groupService: GroupService,
    private readonly authEmailVerifactionCodeService: AuthEmailVerifactionCodeService,
    private readonly mailService: MailService,
    private readonly authSessionService: AuthSessionService,
    private readonly authIpLocationService: AuthIpLocationService,
    private readonly auditService: AuditService
  ) {}

  @Get("getSessionInfo")
  @ApiOperation({
    summary: "A (JSONP or JSON) request to get current user's info and server preference.",
    description: "In order to support JSONP, this API doesn't use HTTP Authorization header."
  })
  async getSessionInfo(@Query() request: GetSessionInfoRequestDto): Promise<GetSessionInfoResponseDto> {
    const [, user] = await this.authSessionService.accessSession(request.token);

    const result: GetSessionInfoResponseDto = {};
    if (user) {
      result.userMeta = await this.userService.getUserMeta(user, user);
      result.joinedGroupsCount = await this.groupService.getUserJoinedGroupsCount(user);
      result.userPrivileges = await this.userPrivilegeService.getUserPrivileges(user.id);
      result.userPreference = await this.userService.getUserPreference(user);
    }

    result.serverPreference = this.configService.config.preference;

    if (request.jsonp)
      return `(window.getSessionInfoCallback || (function (sessionInfo) { window.sessionInfo = sessionInfo; }))(${JSON.stringify(
        result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )});` as any;
    return result;
  }

  @Post("login")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Login with given credentials.",
    description: "Return session token if success."
  })
  async login(
    @Req() req: RequestWithSession,
    @CurrentUser() currentUser: UserEntity,
    @Body() request: LoginRequestDto
  ): Promise<LoginResponseDto> {
    if (currentUser)
      return {
        error: LoginResponseError.ALREADY_LOGGEDIN
      };

    const [error, user] = await this.authService.login(request.username, request.password);

    if (error) {
      if (user && error === LoginResponseError.WRONG_PASSWORD) {
        await this.auditService.log(user.id, "auth.login_failed.wrong_password");
      }

      return {
        error
      };
    }

    await this.auditService.log(user.id, "auth.login");

    return {
      token: await this.authSessionService.newSession(user, req.ip, req.headers["user-agent"])
    };
  }

  @Post("logout")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Logout the current session."
  })
  async logout(
    @CurrentUser() currentUser: UserEntity,
    @Req() req: RequestWithSession
  ): Promise<Record<string, unknown>> {
    const sessionKey = req?.session.sessionKey;
    if (sessionKey) {
      await this.authSessionService.endSession(sessionKey);
    }

    if (currentUser) await this.auditService.log("auth.logout");

    return {};
  }

  @Get("checkAvailability")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Check is a username or email is available."
  })
  async checkAvailability(@Query() request: CheckAvailabilityRequestDto): Promise<CheckAvailabilityResponseDto> {
    const result: CheckAvailabilityResponseDto = {};
    if (request.username != null) {
      result.usernameAvailable = await this.userService.checkUsernameAvailability(request.username);
    }

    if (request.email != null) {
      result.emailAvailable = await this.userService.checkEmailAvailability(request.email);
    }

    return result;
  }

  @Post("sendEmailVerifactionCode")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Send email verifaction code for registering or changing email"
  })
  async sendEmailVerifactionCode(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SendEmailVerificationCodeRequestDto
  ): Promise<SendEmailVerificationCodeResponseDto> {
    if (request.type === EmailVerifactionCodeType.Register) {
      if (currentUser)
        return {
          error: SendEmailVerificationCodeResponseError.ALREADY_LOGGEDIN
        };

      if (!(await this.userService.checkEmailAvailability(request.email)))
        return {
          error: SendEmailVerificationCodeResponseError.DUPLICATE_EMAIL
        };
    } else if (request.type === EmailVerifactionCodeType.ChangeEmail) {
      if (!currentUser)
        return {
          error: SendEmailVerificationCodeResponseError.PERMISSION_DENIED
        };

      if (!(await this.userService.checkEmailAvailability(request.email)))
        return {
          error: SendEmailVerificationCodeResponseError.DUPLICATE_EMAIL
        };

      // No need to check old email === new email
    } else if (request.type === EmailVerifactionCodeType.ResetPassword) {
      if (currentUser)
        return {
          error: SendEmailVerificationCodeResponseError.ALREADY_LOGGEDIN
        };

      if (await this.userService.checkEmailAvailability(request.email))
        return {
          error: SendEmailVerificationCodeResponseError.NO_SUCH_USER
        };
    }

    if (!this.configService.config.preference.requireEmailVerification)
      return {
        error: SendEmailVerificationCodeResponseError.FAILED_TO_SEND,
        errorMessage: "Email verification code disabled."
      };

    const code = await this.authEmailVerifactionCodeService.generate(request.email);
    if (!code)
      return {
        error: SendEmailVerificationCodeResponseError.RATE_LIMITED
      };

    const sendMailErrorMessage = await this.mailService.sendMail(
      {
        [EmailVerifactionCodeType.Register]: MailTemplate.RegisterVerificationCode,
        [EmailVerifactionCodeType.ChangeEmail]: MailTemplate.ChangeEmailVerificationCode,
        [EmailVerifactionCodeType.ResetPassword]: MailTemplate.ResetPasswordVerificationCode
      }[request.type],
      request.locale,
      {
        code
      },
      request.email
    );

    if (sendMailErrorMessage)
      return {
        error: SendEmailVerificationCodeResponseError.FAILED_TO_SEND,
        errorMessage: sendMailErrorMessage
      };

    return {};
  }

  @Post("register")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Register then login.",
    description: "Return the session token if success."
  })
  async register(
    @Req() req: RequestWithSession,
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RegisterRequestDto
  ): Promise<RegisterResponseDto> {
    if (currentUser)
      return {
        error: RegisterResponseError.ALREADY_LOGGEDIN
      };

    const [error, user] = await this.authService.register(
      request.username,
      request.email,
      request.emailVerificationCode,
      request.password
    );

    if (error)
      return {
        error
      };

    await this.auditService.log(user.id, "auth.register", {
      username: request.username,
      email: request.email
    });

    return {
      token: await this.authSessionService.newSession(user, req.ip, req.headers["user-agent"])
    };
  }

  @Post("resetPassword")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Reset a user's password with email verification code and then login."
  })
  async resetPassword(
    @Req() req: RequestWithSession,
    @CurrentUser() currentUser: UserEntity,
    @Body() request: ResetPasswordRequestDto
  ): Promise<ResetPasswordResponseDto> {
    if (currentUser)
      return {
        error: ResetPasswordResponseError.ALREADY_LOGGEDIN
      };

    const user = await this.userService.findUserByEmail(request.email);
    if (!user)
      return {
        error: ResetPasswordResponseError.NO_SUCH_USER
      };

    const userAuth = await this.authService.findUserAuthByUserId(user.id);
    if (!(await this.authEmailVerifactionCodeService.verify(request.email, request.emailVerificationCode)))
      return {
        error: ResetPasswordResponseError.INVALID_EMAIL_VERIFICATION_CODE
      };

    await this.authService.changePassword(userAuth, request.newPassword);
    await this.authEmailVerifactionCodeService.revoke(request.email, request.emailVerificationCode);

    // Revoke ALL previous sessions
    await this.authSessionService.revokeAllSessionsExcept(user.id, null);

    await this.auditService.log(user.id, "auth.reset_password");

    return {
      token: await this.authSessionService.newSession(user, req.ip, req.headers["user-agent"])
    };
  }

  @Post("listUserSessions")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List a user's current logged-in sessions."
  })
  async listUserSessions(
    @Req() req: RequestWithSession,
    @CurrentUser() currentUser: UserEntity,
    @Body() request: ListUserSessionsRequestDto
  ): Promise<ListUserSessionsResponseDto> {
    if (
      !(
        (currentUser && currentUser.id === request.userId) ||
        (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER))
      )
    )
      return {
        error: ListUserSessionsResponseError.PERMISSION_DENIED
      };

    const sessions = await this.authSessionService.listUserSessions(request.userId);

    return {
      sessions: sessions.map(sessionInfo => ({
        ...sessionInfo,
        loginIpLocation: this.authIpLocationService.query(sessionInfo.loginIp)
      })),
      currentSessionId: request.userId === currentUser.id ? req.session.sessionId : null
    };
  }

  @Post("revokeUserSession")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Revoke a user's one session or sessions."
  })
  async revokeUserSession(
    @Req() req: RequestWithSession,
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RevokeUserSessionRequestDto
  ): Promise<RevokeUserSessionResponseDto> {
    if (
      !(
        (currentUser && currentUser.id === request.userId) ||
        (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER))
      )
    )
      return {
        error: RevokeUserSessionResponseError.PERMISSION_DENIED
      };

    const user = request.userId === currentUser.id ? currentUser : await this.userService.findUserById(request.userId);
    if (!user)
      return {
        error: RevokeUserSessionResponseError.NO_SUCH_USER
      };

    if (request.sessionId) {
      await this.authSessionService.revokeSession(request.userId, request.sessionId);

      if (request.userId === currentUser.id) await this.auditService.log("auth.session.revoke");
      else await this.auditService.log("auth.session.revoke_others", AuditLogObjectType.User, request.userId);
    } else {
      if (request.userId === currentUser.id) {
        await this.authSessionService.revokeAllSessionsExcept(request.userId, req.session.sessionId);
        await this.auditService.log("auth.session.revoke_all_except_current");
      } else {
        await this.authSessionService.revokeAllSessionsExcept(request.userId, null);
        await this.auditService.log("auth.session.revoke_others_all", AuditLogObjectType.User, request.userId);
      }
    }

    return {};
  }
}
