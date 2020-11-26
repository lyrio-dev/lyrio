import { createHash } from "crypto";

import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";

import { Repository, Connection } from "typeorm";
import * as bcrypt from "bcrypt";

import { UserEntity } from "@/user/user.entity";
import { UserService } from "@/user/user.service";
import { AuthService } from "@/auth/auth.service";

import { UserMigrationInfoEntity } from "./user-migration-info.entity";

@Injectable()
export class UserMigrationService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserMigrationInfoEntity)
    private readonly userMigrationInfoRepository: Repository<UserMigrationInfoEntity>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {}

  async findUserMigrationInfoByOldUsername(oldUsername: string): Promise<UserMigrationInfoEntity> {
    return await this.userMigrationInfoRepository.findOne({
      oldUsername
    });
  }

  async findUserMigrationInfoByUserId(userId: number): Promise<UserMigrationInfoEntity> {
    return await this.userMigrationInfoRepository.findOne({
      userId
    });
  }

  async migrateUser(
    userMigrationInfo: UserMigrationInfoEntity,
    newUsername: string,
    newPassword: string
  ): Promise<UserEntity> {
    const user = await this.userService.findUserById(userMigrationInfo.userId);
    const userAuth = await this.authService.findUserAuthByUserId(user.id);

    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      if (userMigrationInfo.usernameMustChange) {
        user.username = newUsername;
        await transactionalEntityManager.save(user);
      }

      await this.authService.changePassword(userAuth, newPassword, transactionalEntityManager);

      userMigrationInfo.migrated = true;
      await transactionalEntityManager.save(userMigrationInfo);
    });

    return user;
  }

  private hashOldPassword(oldPassword: string) {
    // The magic salt of SYZOJ 2 -- "syzoj2_xxx"
    return createHash("md5").update(`${oldPassword}syzoj2_xxx`).digest("hex").toLowerCase();
  }

  async checkOldPassword(userMigrationInfo: UserMigrationInfoEntity, oldPassword: string): Promise<boolean> {
    const oldPasswordHash = this.hashOldPassword(oldPassword);
    return await bcrypt.compare(oldPasswordHash, userMigrationInfo.oldPasswordHashBcrypt);
  }

  // If an user has NOT been migrated, but we need to change its password
  // We must change its "password in old system" so that the user can migrate with its "new password"
  async changeOldPassword(userMigrationInfo: UserMigrationInfoEntity, oldPassword: string): Promise<void> {
    const oldPasswordHash = this.hashOldPassword(oldPassword);
    userMigrationInfo.oldPasswordHashBcrypt = await bcrypt.hash(oldPasswordHash, 10);
    await this.userMigrationInfoRepository.save(userMigrationInfo);
  }
}
