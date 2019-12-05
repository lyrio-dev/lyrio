import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection, In } from "typeorm";

import { UserEntity } from "./user.entity";
import { UserPrivilegeEntity, UserPrivilegeType } from "./user-privilege.entity";

// NOTE: This implementation of user privilege is ugly.
//       Does anyone have better ideas?

@Injectable()
export class UserPrivilegeService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserPrivilegeEntity)
    private readonly userPrivilegeRepository: Repository<UserPrivilegeEntity>
  ) {}

  async userHasPrivilege(user: UserEntity, privilegeType: UserPrivilegeType): Promise<boolean> {
    return await this.userPrivilegeRepository.count({
      userId: user.id,
      privilegeType: privilegeType
    }) != 0;
  }

  async getUserPrivileges(user: UserEntity): Promise<UserPrivilegeType[]> {
    return (await this.userPrivilegeRepository.find({ userId: user.id })).map(userPrivilege => userPrivilege.privilegeType);
  }

  async setUserPrivileges(user: UserEntity, newPrivilegeTypes: UserPrivilegeType[]): Promise<boolean> {
    const oldPrivilegeTypes = await this.getUserPrivileges(user);
    try {
      const addList = newPrivilegeTypes.filter(privilegeType => !oldPrivilegeTypes.includes(privilegeType));
      const delList = oldPrivilegeTypes.filter(privilegeType => !newPrivilegeTypes.includes(privilegeType));
      
      if (addList.length === 0 && delList.length === 0) return true;

      await this.connection.transaction("SERIALIZABLE", async transactionalEntityManager => {
        await transactionalEntityManager.delete(UserPrivilegeEntity, {
          userId: user.id,
          privilegeType: In(delList)
        });

        await Promise.all(delList.map(privilegeType => async () => {
          const userPrivilege = new UserPrivilegeEntity();
          userPrivilege.id = user.id;
          userPrivilege.privilegeType = privilegeType;
          await transactionalEntityManager.save(userPrivilege);
        }));
      });

      return true;
    } catch (e) {
      // TODO: Database error log?
      // TODO: Error message?
      return false;
    }
  }
}
