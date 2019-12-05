import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection, In } from "typeorm";

import { UserEntity } from "./user.entity";
import {
  UserPrivilegeEntity,
  UserPrivilegeType
} from "./user-privilege.entity";
import { UserSetUserPrivilegesResponseError } from "./dto";
import { UserService } from "./user.service";

// NOTE: This implementation of user privilege is ugly.
//       Does anyone have better ideas?

@Injectable()
export class UserPrivilegeService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserPrivilegeEntity)
    private readonly userPrivilegeRepository: Repository<UserPrivilegeEntity>,
    private readonly userService: UserService
  ) {}

  async userHasPrivilege(
    user: UserEntity,
    privilegeType: UserPrivilegeType
  ): Promise<boolean> {
    return (
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
  ): Promise<UserSetUserPrivilegesResponseError> {
    if (!(await this.userService.userExists(userId)))
      return UserSetUserPrivilegesResponseError.NO_SUCH_USER;

    const oldPrivilegeTypes = await this.getUserPrivileges(userId);
    try {
      const addList = newPrivilegeTypes.filter(
        privilegeType => !oldPrivilegeTypes.includes(privilegeType)
      );
      const delList = oldPrivilegeTypes.filter(
        privilegeType => !newPrivilegeTypes.includes(privilegeType)
      );

      if (addList.length === 0 && delList.length === 0) return null;

      await this.connection.transaction(
        "SERIALIZABLE",
        async transactionalEntityManager => {
          if (delList.length !== 0) {
            await transactionalEntityManager.delete(UserPrivilegeEntity, {
              userId: userId,
              privilegeType: In(delList)
            });
          }

          if (addList.length !== 0) {
            await Promise.all(
              addList.map(async privilegeType => {
                const userPrivilege = new UserPrivilegeEntity();
                userPrivilege.userId = userId;
                userPrivilege.privilegeType = privilegeType;
                await transactionalEntityManager.save(userPrivilege);
              })
            );
          }
        }
      );

      return null;
    } catch (e) {
      // TODO: Database error log?
      //       Error message?
      return UserSetUserPrivilegesResponseError.FAILED;
    }
  }
}
