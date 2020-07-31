import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import * as jwt from "jsonwebtoken";

import {
  LoginRequestDto,
  RegisterRequestDto,
  GetCurrentUserAndPreferenceResponseDto,
  LoginResponseDto,
  LoginResponseError,
  CheckAvailabilityRequestDto,
  CheckAvailabilityResponseDto,
  SendEmailVerificationCodeRequestDto,
  SendEmailVerificationCodeResponseDto,
  SendEmailVerificationCodeResponseError,
  RegisterResponseDto,
  RegisterResponseError
} from "./dto";
import { ConfigService } from "@/config/config.service";
import { UserService } from "@/user/user.service";
import { AuthService } from "./auth.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { UserPrivilegeService } from "@/user/user-privilege.service";
import { GroupService } from "@/group/group.service";
import { AuthEmailVerifactionCodeService } from "./auth-email-verifaction-code.service";
import { MailService, MailTemplate } from "@/mail/mail.service";

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
    private readonly mailService: MailService
  ) {}

  @Get("getCurrentUserAndPreference")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the logged-in user's meta and preference and the server's preference."
  })
  async getCurrentUserAndPreference(
    @CurrentUser() currentUser: UserEntity
  ): Promise<GetCurrentUserAndPreferenceResponseDto> {
    const result: GetCurrentUserAndPreferenceResponseDto = new GetCurrentUserAndPreferenceResponseDto();
    if (currentUser) {
      result.userMeta = await this.userService.getUserMeta(currentUser, currentUser);
      result.joinedGroupsCount = await this.groupService.getUserJoinedGroupsCount(currentUser);
      result.userPrivileges = await this.userPrivilegeService.getUserPrivileges(currentUser.id);
      result.userPreference = await this.userService.getUserPreference(currentUser);
    }

    result.serverPreference = this.configService.config.preference;

    return result;
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
      token: jwt.sign(user.id.toString(), this.configService.config.security.sessionSecret)
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
    summary: "Send email verifaction code for register"
  })
  async sendEmailVerifactionCode(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SendEmailVerificationCodeRequestDto
  ): Promise<SendEmailVerificationCodeResponseDto> {
    if (currentUser)
      return {
        error: SendEmailVerificationCodeResponseError.ALREADY_LOGGEDIN
      };

    if (!this.configService.config.preference.requireEmailVerification)
      return {
        error: SendEmailVerificationCodeResponseError.FAILED_TO_SEND,
        errorMessage: "Register verification code disabled."
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
      MailTemplate.RegisterVerificationCode,
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
      token: jwt.sign(user.id.toString(), this.configService.config.security.sessionSecret)
    };
  }
}
