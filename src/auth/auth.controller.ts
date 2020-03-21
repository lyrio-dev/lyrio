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
  RegisterResponseDto,
  RegisterResponseError
} from "./dto";
import { ConfigService } from "@/config/config.service";
import { UserService } from "@/user/user.service";
import { AuthService } from "./auth.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly authService: AuthService
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

    const [error, user] = await this.authService.register(request.username, request.email, request.password);

    if (error)
      return {
        error: error
      };

    return {
      token: jwt.sign(user.id.toString(), this.configService.config.security.sessionSecret)
    };
  }
}
