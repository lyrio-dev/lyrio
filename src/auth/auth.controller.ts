import { Controller, Get, Post, Body, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

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
  GetSessionInfoResponseDto
} from "./dto";
import { ConfigService } from "@/config/config.service";
import { UserService } from "@/user/user.service";
import { AuthService } from "./auth.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { AuthEmailVerifactionCodeService, EmailVerifactionCodeType } from "./auth-email-verifaction-code.service";
import { MailService, MailTemplate } from "@/mail/mail.service";
import { AuthSessionService } from "./auth-session.service";
import { UserPrivilegeService } from "@/user/user-privilege.service";
import { GroupService } from "@/group/group.service";

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
    private readonly authSessionService: AuthSessionService
  ) {}

  @Get("getSessionInfo")
  @ApiOperation({
    summary: "A (JSONP or JSON) request to get current user's info and server preference.",
    description: "In order to support JSONP, this API doesn't use HTTP Authorization header."
  })
  async getSessionInfo(@Query() request: GetSessionInfoRequestDto): Promise<GetSessionInfoResponseDto> {
    const user = await this.authSessionService.getSessionUser(request.token);

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
      )});` as any;
    else return result;
  }

  @Post("login")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Login with given credentials.",
    description: "Return session token if success."
  })
  async login(@CurrentUser() currentUser: UserEntity, @Body() request: LoginRequestDto): Promise<LoginResponseDto> {
    if (currentUser)
      return {
        error: LoginResponseError.ALREADY_LOGGEDIN
      };

    const [error, user] = await this.authService.login(request.username, request.password);

    if (error)
      return {
        error: error
      };

    return {
      token: await this.authSessionService.generateSessionToken(user)
    };
  }

  @Post("logout")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Logout the current session."
  })
  async logout(): Promise<object> {
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
    } else if (request.type === EmailVerifactionCodeType.ChangeEmail) {
      if (!currentUser) {
        return {
          error: SendEmailVerificationCodeResponseError.PERMISSION_DENIED
        };
      }

      // No need to check old email === new email
    }

    if (!this.configService.config.preference.requireEmailVerification)
      return {
        error: SendEmailVerificationCodeResponseError.FAILED_TO_SEND,
        errorMessage: "Email verification code disabled."
      };

    if (!(await this.userService.checkEmailAvailability(request.email)))
      return {
        error: SendEmailVerificationCodeResponseError.DUPLICATE_EMAIL
      };

    const code = await this.authEmailVerifactionCodeService.generate(request.email);
    if (!code)
      return {
        error: SendEmailVerificationCodeResponseError.RATE_LIMITED
      };

    const sendMailErrorMessage = await this.mailService.sendMail(
      {
        [EmailVerifactionCodeType.Register]: MailTemplate.RegisterVerificationCode,
        [EmailVerifactionCodeType.ChangeEmail]: MailTemplate.ChangeEmailVerificationCode
      }[request.type],
      request.locale,
      {
        code: code
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
        error: error
      };

    return {
      token: await this.authSessionService.generateSessionToken(user)
    };
  }
}
