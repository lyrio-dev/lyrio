import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";

import { Repository, DataSource } from "typeorm";

import { UserEntity } from "./user.entity";
import { UserPrivilegeEntity, UserPrivilegeType } from "./user-privilege.entity";
import { UserService } from "./user.service";

import { SetUserPrivilegesResponseError } from "./dto";

export { UserPrivilegeType } from "./user-privilege.entity";

@Injectable()
export class UserPrivilegeService {
  constructor(
    @InjectDataSource()
    private readonly connection: DataSource,
    @InjectRepository(UserPrivilegeEntity)
    private readonly userPrivilegeRepository: Repository<UserPrivilegeEntity>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {}

  async userHasPrivilege(user: UserEntity, privilegeType: UserPrivilegeType): Promise<boolean> {
    return (
      user &&
      (user.isAdmin ||
        (await this.userPrivilegeRepository.countBy({
          userId: user.id,
          privilegeType
        })) !== 0)
    );
  }

  async getUserPrivileges(userId: number): Promise<UserPrivilegeType[]> {
    return (await this.userPrivilegeRepository.findBy({ userId })).map(userPrivilege => userPrivilege.privilegeType);
  }

  async setUserPrivileges(
    userId: number,
    newPrivilegeTypes: UserPrivilegeType[]
  ): Promise<SetUserPrivilegesResponseError> {
    if (!(await this.userService.userExists(userId))) return SetUserPrivilegesResponseError.NO_SUCH_USER;

    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      await transactionalEntityManager.delete(UserPrivilegeEntity, {
        userId
      });

      for (const newPrivilegeType of newPrivilegeTypes) {
        const userPrivilege = new UserPrivilegeEntity();
        userPrivilege.privilegeType = newPrivilegeType;
        userPrivilege.userId = userId;
        await transactionalEntityManager.save(userPrivilege); // eslint-disable-line no-await-in-loop
      }
    });

    return null;
  }
}
