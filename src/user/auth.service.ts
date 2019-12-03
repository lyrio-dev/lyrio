import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { UserLoginResponseError, UserRegisterResponseError } from "./dto";
import { Repository, Connection } from "typeorm";
import * as bcrypt from "bcrypt";

import { UserEntity } from "./user.entity";
import { UserAuthEntity } from "./user-auth.entity";

@Injectable()
export class AuthService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserAuthEntity)
    private readonly userAuthRepository: Repository<UserAuthEntity>
  ) {}

  async findById(id: number): Promise<UserEntity> {
    return await this.userRepository.findOne(id);
  }

  async register(
    currentUser: UserEntity,
    username: string,
    email: string,
    password: string
  ): Promise<[UserRegisterResponseError, UserEntity]> {
    if (currentUser) return [UserRegisterResponseError.ALREADY_LOGGEDIN, null];

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
        return [UserRegisterResponseError.DUPLICATE_USERNAME, null];

      if (await this.userRepository.count({ email: email }))
        return [UserRegisterResponseError.DUPLICATE_EMAIL, null];

      // Unknown error
      // (or the duplicate user's username is just changed?)
      throw e;
    }
  }

  async login(
    currentUser: UserEntity,
    username: string,
    password: string
  ): Promise<[UserLoginResponseError, UserEntity]> {
    if (currentUser) return [UserLoginResponseError.ALREADY_LOGGEDIN, null];

    const user: UserEntity = await this.userRepository.findOne({
      username: username
    });

    if (!user) return [UserLoginResponseError.NO_SUCH_USER, null];

    const userAuth: UserAuthEntity = await user.userAuth;
    if (!(await bcrypt.compare(password, userAuth.password)))
      return [UserLoginResponseError.WRONG_PASSWORD, null];

    return [null, user];
  }
}
