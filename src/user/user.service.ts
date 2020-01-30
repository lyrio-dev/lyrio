import { Injectable, forwardRef, Inject } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection } from "typeorm";

import { UserEntity } from "./user.entity";
import { AuthService } from "@/auth/auth.service";
import { UpdateUserProfileResponseError } from "./dto";

@Injectable()
export class UserService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService
  ) {}

  async findUserById(id: number): Promise<UserEntity> {
    return await this.userRepository.findOne(id);
  }

  async findUserByUsername(username: string): Promise<UserEntity> {
    return await this.userRepository.findOne({
      username: username
    });
  }

  async userExists(id: number): Promise<boolean> {
    return (await this.userRepository.count({ id: id })) != 0;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    return (
      (await this.userRepository.count({
        username: username
      })) == 0
    );
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    return (
      (await this.userRepository.count({
        email: email
      })) == 0
    );
  }

  async updateUserProfile(
    user: UserEntity,
    username?: string,
    email?: string,
    bio?: string,
    password?: string
  ): Promise<UpdateUserProfileResponseError> {
    const changingUsername = username != null;
    const changingEmail = email != null;

    try {
      if (changingUsername) user.username = username;
      if (changingEmail) user.email = email;
      if (bio != null) user.bio = bio;

      if (password == null) await this.userRepository.save(user);
      else
        await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
          await this.authService.changePassword(await this.authService.findUserAuthByUserId(user.id), password);
          await transactionalEntityManager.save(user);
        });
    } catch (e) {
      if (changingUsername && !(await this.checkUsernameAvailability(username)))
        return UpdateUserProfileResponseError.DUPLICATE_USERNAME;

      if (changingEmail && !(await this.checkEmailAvailability(email)))
        return UpdateUserProfileResponseError.DUPLICATE_EMAIL;

      throw e;
    }

    return null;
  }
}
