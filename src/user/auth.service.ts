import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { AuthLoginResponseError, AuthRegisterResponseError } from "./dto";
import { Repository, Connection } from "typeorm";
import * as bcrypt from "bcrypt";

import { UserEntity } from "./user.entity";
import { UserAuthEntity } from "./user-auth.entity";
import { UserService } from "./user.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserAuthEntity)
    private readonly userAuthRepository: Repository<UserAuthEntity>,
    private readonly userService: UserService
  ) {}

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<[AuthRegisterResponseError, UserEntity]> {
    // There's a race condition on user inserting. If we do checking before inserting,
    // inserting will still fail if another with same username is inserted after we check
    try {
      let user: UserEntity;
      await this.connection.transaction(
        "SERIALIZABLE",
        async transactionalEntityManager => {
          user = new UserEntity();
          user.username = username;
          user.email = email;
          user.bio = "";
          user.isAdmin = false;
          await transactionalEntityManager.save(user);

          const userAuth = new UserAuthEntity();
          userAuth.userId = user.id;
          userAuth.password = await bcrypt.hash(password, 10);
          await transactionalEntityManager.save(userAuth);
        }
      );

      return [null, user];
    } catch (e) {
      if (await this.userRepository.count({ username: username }))
        return [AuthRegisterResponseError.DUPLICATE_USERNAME, null];

      if (await this.userRepository.count({ email: email }))
        return [AuthRegisterResponseError.DUPLICATE_EMAIL, null];

      // Unknown error
      // (or the duplicate user's username is just changed?)
      throw e;
    }
  }

  async login(
    username: string,
    password: string
  ): Promise<[AuthLoginResponseError, UserEntity]> {
    const user: UserEntity = await this.userService.findUserByUsername(
      username
    );

    if (!user) return [AuthLoginResponseError.NO_SUCH_USER, null];

    const userAuth: UserAuthEntity = await user.userAuth;
    if (!(await bcrypt.compare(password, userAuth.password)))
      return [AuthLoginResponseError.WRONG_PASSWORD, null];

    return [null, user];
  }
}
