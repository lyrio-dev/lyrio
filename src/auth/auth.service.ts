import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";

import { Repository, Connection, EntityManager } from "typeorm";
import * as bcrypt from "bcrypt";

import { UserEntity } from "@/user/user.entity";
import { UserService } from "@/user/user.service";
import { UserInformationEntity } from "@/user/user-information.entity";
import { UserPreferenceEntity } from "@/user/user-preference.entity";
import { ConfigService } from "@/config/config.service";

import { UserAuthEntity } from "./user-auth.entity";
import { AuthEmailVerifactionCodeService } from "./auth-email-verifaction-code.service";

import { LoginResponseError, RegisterResponseError } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserAuthEntity)
    private readonly userAuthRepository: Repository<UserAuthEntity>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthEmailVerifactionCodeService))
    private readonly authEmailVerifactionCodeService: AuthEmailVerifactionCodeService,
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  async findUserAuthByUserId(userId: number): Promise<UserAuthEntity> {
    return await this.userAuthRepository.findOne({
      userId
    });
  }

  async register(
    username: string,
    email: string,
    emailVerificationCode: string,
    password: string
  ): Promise<[error: RegisterResponseError, user: UserEntity]> {
    // There's a race condition on user inserting. If we do checking before inserting,
    // inserting will still fail if another with same username is inserted after we check

    if (this.configService.config.preference.requireEmailVerification) {
      if (!(await this.authEmailVerifactionCodeService.verify(email, emailVerificationCode)))
        return [RegisterResponseError.INVALID_EMAIL_VERIFICATION_CODE, null];
    }

    try {
      let user: UserEntity;
      await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        user = new UserEntity();
        user.username = username;
        user.email = email;
        user.publicEmail = true;
        user.bio = "";
        user.avatarInfo = "gravatar:";
        user.isAdmin = false;
        user.submissionCount = 0;
        user.acceptedProblemCount = 0;
        user.rating = 0;
        user.registrationTime = new Date();
        await transactionalEntityManager.save(user);

        const userAuth = new UserAuthEntity();
        userAuth.userId = user.id;
        userAuth.password = await this.hashPassword(password);
        await transactionalEntityManager.save(userAuth);

        const userInformation = new UserInformationEntity();
        userInformation.userId = user.id;
        userInformation.organization = "";
        userInformation.location = "";
        userInformation.url = "";
        userInformation.telegram = "";
        userInformation.qq = "";
        userInformation.github = "";
        await transactionalEntityManager.save(userInformation);

        const userPreference = new UserPreferenceEntity();
        userPreference.userId = user.id;
        userPreference.preference = {};
        await transactionalEntityManager.save(userPreference);
      });

      if (this.configService.config.preference.requireEmailVerification) {
        await this.authEmailVerifactionCodeService.revoke(email, emailVerificationCode);
      }

      return [null, user];
    } catch (e) {
      if (!(await this.userService.checkUsernameAvailability(username)))
        return [RegisterResponseError.DUPLICATE_USERNAME, null];

      if (!(await this.userService.checkEmailAvailability(email))) return [RegisterResponseError.DUPLICATE_EMAIL, null];

      // Unknown error
      // (or the duplicate user's username is just changed?)
      throw e;
    }
  }

  async checkPassword(userAuth: UserAuthEntity, password: string): Promise<boolean> {
    return await bcrypt.compare(password, userAuth.password);
  }

  async changePassword(
    userAuth: UserAuthEntity,
    password: string,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    userAuth.password = await this.hashPassword(password);
    if (transactionalEntityManager) await transactionalEntityManager.save(userAuth);
    else await this.userAuthRepository.save(userAuth);
  }

  async login(username: string, password: string): Promise<[LoginResponseError, UserEntity]> {
    const user: UserEntity = await this.userService.findUserByUsername(username);

    if (!user) return [LoginResponseError.NO_SUCH_USER, null];

    const userAuth: UserAuthEntity = await user.userAuth;
    if (!(await this.checkPassword(userAuth, password))) return [LoginResponseError.WRONG_PASSWORD, user];

    return [null, user];
  }
}
