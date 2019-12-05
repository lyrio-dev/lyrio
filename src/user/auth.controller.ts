import { Controller, Get, Post, Body } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import * as jwt from "jsonwebtoken";

import {
  UserLoginRequestDto,
  UserRegisterRequestDto,
  UserGetSelfMetaResponseDto,
  UserLoginResponseDto,
  UserLoginResponseError,
  UserRegisterResponseDto,
  UserRegisterResponseError
} from "./dto";
import { ConfigService } from "@/config/config.service";
import { AuthService } from "./auth.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "./user.entity";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {}

  @Get("getSelfMeta")
  @ApiResponse({
    status: 200,
    type: UserGetSelfMetaResponseDto,
    description: "Get the metadata of the current logged-in user"
  })
  async getSelfMeta(
    @CurrentUser() currentUser: UserEntity
  ): Promise<UserGetSelfMetaResponseDto> {
    const result: UserGetSelfMetaResponseDto = new UserGetSelfMetaResponseDto();
    if (currentUser) {
      result.userMeta = {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        bio: currentUser.bio
      };
    } else {
      result.userMeta = null;
    }

    return result;
  }

  @Post("login")
  @ApiResponse({
    status: 200,
    type: UserLoginResponseDto,
    description:
      "Login, return the logged-in user's metadata and token if success"
  })
  async login(
    @CurrentUser() currentUser: UserEntity,
    @Body() userLoginRequestDto: UserLoginRequestDto
  ): Promise<UserLoginResponseDto> {
    if (currentUser)
      return {
        error: UserLoginResponseError.ALREADY_LOGGEDIN
      };

    const [error, user] = await this.authService.login(
      userLoginRequestDto.username,
      userLoginRequestDto.password
    );

    if (error)
      return {
        error: error
      };

    return {
      userMeta: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio
      },
      token: jwt.sign(
        user.id.toString(),
        this.configService.config.security.sessionSecret
      )
    };
  }

  @Post("logout")
  async logout(): Promise<object> {
    return {};
  }

  @Post("register")
  @ApiResponse({
    status: 200,
    type: UserRegisterResponseDto,
    description:
      "Register then login, return the new user's metadata and token if success"
  })
  async register(
    @CurrentUser() currentUser: UserEntity,
    @Body() userRegisterRequestDto: UserRegisterRequestDto
  ): Promise<UserRegisterResponseDto> {
    if (currentUser)
      return {
        error: UserRegisterResponseError.ALREADY_LOGGEDIN
      };

    const [error, user] = await this.authService.register(
      userRegisterRequestDto.username,
      userRegisterRequestDto.email,
      userRegisterRequestDto.password
    );

    if (error)
      return {
        error: error
      };

    return {
      userMeta: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio
      },
      token: jwt.sign(
        user.id.toString(),
        this.configService.config.security.sessionSecret
      )
    };
  }
}
