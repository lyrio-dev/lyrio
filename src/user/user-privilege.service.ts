import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection, In } from "typeorm";

import { UserEntity } from "./user.entity";
import { UserPrivilegeEntity, UserPrivilegeType } from "./user-privilege.entity";
import { SetUserPrivilegesResponseError } from "./dto";
import { UserService } from "./user.service";

export { UserPrivilegeType } from "./user-privilege.entity";

@Injectable()
export class UserPrivilegeService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserPrivilegeEntity)
    private readonly userPrivilegeRepository: Repository<UserPrivilegeEntity>,
    private readonly userService: UserService
  ) {}

  async userHasPrivilege(user: UserEntity, privilegeType: UserPrivilegeType): Promise<boolean> {
    return (
      user.isAdmin ||
      (await this.userPrivilegeRepository.count({
        userId: user.id,
        privilegeType: privilegeType
      })) != 0
    );
  }

  async getUserPrivileges(userId: number): Promise<UserPrivilegeType[]> {
    return (await this.userPrivilegeRepository.find({ userId: userId })).map(
      userPrivilege => userPrivilege.privilegeType
    );
  }

  async setUserPrivileges(
    userId: number,
    newPrivilegeTypes: UserPrivilegeType[]
  ): Promise<SetUserPrivilegesResponseError> {
    if (!(await this.userService.userExists(userId))) return SetUserPrivilegesResponseError.NO_SUCH_USER;

    await this.connection.transaction("SERIALIZABLE", async transactionalEntityManager => {
      await transactionalEntityManager.delete(UserPrivilegeEntity, {
        userId: userId
      });

      for (const newPrivilegeType of newPrivilegeTypes) {
        const userPrivilege = new UserPrivilegeEntity();
        userPrivilege.privilegeType = newPrivilegeType;
        userPrivilege.userId = userId;
        await transactionalEntityManager.save(userPrivilege);
      }
    });

    return null;
  }
}
