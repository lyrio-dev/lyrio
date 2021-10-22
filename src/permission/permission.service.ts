import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";

import { Repository, EntityManager, Connection, FindConditions } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { UserService } from "@/user/user.service";
import { GroupEntity } from "@/group/group.entity";
import { GroupService } from "@/group/group.service";

import { PermissionForUserEntity } from "./permission-for-user.entity";
import { PermissionForGroupEntity } from "./permission-for-group.entity";
import { PermissionObjectType } from "./permission-object-type.enum";

import { UserMetaDto } from "@/user/dto";
import { GroupMetaDto } from "@/group/dto";

export { PermissionObjectType } from "./permission-object-type.enum";

export interface AccessControlListItemForUser<PermissionLevel extends number> {
  userId: number;
  permissionLevel: PermissionLevel;
}

export interface AccessControlListItemForGroup<PermissionLevel extends number> {
  groupId: number;
  permissionLevel: PermissionLevel;
}

export interface AccessControlList<PermissionLevel extends number> {
  userPermissions: AccessControlListItemForUser<PermissionLevel>[];
  groupPermissions: AccessControlListItemForGroup<PermissionLevel>[];
}

export interface AccessControlListValidationErrorResponse {
  error?: any; // eslint-disable-lien @typescript/no-explicit-any
  errorObjectId?: number;
}

export interface AccessControlListWithSubjectMeta<PermissionLevel extends number = number> {
  userPermissions: {
    user: UserMetaDto;
    permissionLevel: PermissionLevel;
  }[];
  groupPermissions: {
    group: GroupMetaDto;
    permissionLevel: PermissionLevel;
  }[];
}

@Injectable()
export class PermissionService {
  constructor(
    @InjectConnection()
    private connection: Connection,
    @InjectRepository(PermissionForUserEntity)
    private readonly permissionForUserRepository: Repository<PermissionForUserEntity>,
    @InjectRepository(PermissionForGroupEntity)
    private readonly permissionForGroupRepository: Repository<PermissionForGroupEntity>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly groupService: GroupService
  ) {}

  /**
   * This function validates a "set permission" request for the existence of user/groups.
   */
  public async validateAccessControlList<PermissionLevel extends number>(
    acl: AccessControlList<number>,
    PermissionLevelEnum: { [key: string]: PermissionLevel | string }
  ): Promise<AccessControlListValidationErrorResponse> {
    if (
      !Array.isArray(acl.userPermissions) ||
      !Array.isArray(acl.groupPermissions) ||
      acl.userPermissions.some(
        ({ userId, permissionLevel }) =>
          !Number.isSafeInteger(userId) || !Number.isSafeInteger(userId) || !(permissionLevel in PermissionLevelEnum)
      ) ||
      acl.groupPermissions.some(
        ({ groupId, permissionLevel }) =>
          !Number.isSafeInteger(groupId) || !Number.isSafeInteger(groupId) || !(permissionLevel in PermissionLevelEnum)
      )
    )
      return {
        error: "INVALID_ACL"
      };

    const users = await this.userService.findUsersByExistingIds(
      acl.userPermissions.map(userPermission => userPermission.userId)
    );
    for (const i of acl.userPermissions.keys()) {
      const { userId } = acl.userPermissions[i];
      if (!users[i])
        return {
          error: "NO_SUCH_USER",
          errorObjectId: userId
        };
    }

    const groups = await this.groupService.findGroupsByExistingIds(
      acl.groupPermissions.map(groupPermission => groupPermission.groupId)
    );
    for (const i of acl.groupPermissions.keys()) {
      const { groupId } = acl.groupPermissions[i];
      if (!groups[i])
        return {
          error: "NO_SUCH_GROUP",
          errorObjectId: groupId
        };
    }
  }

  private async setUserPermissionLevel<PermissionLevel extends number>(
    user: UserEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionLevel: PermissionLevel,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const permissionForUser = new PermissionForUserEntity();
    permissionForUser.objectId = objectId;
    permissionForUser.objectType = objectType;
    permissionForUser.permissionLevel = permissionLevel;
    permissionForUser.userId = user.id;

    const queryBuilder = transactionalEntityManager
      ? transactionalEntityManager.createQueryBuilder()
      : this.permissionForUserRepository.createQueryBuilder();
    await queryBuilder
      .insert()
      .into(PermissionForUserEntity)
      .values(permissionForUser)
      .orUpdate({ overwrite: ["permissionLevel"] })
      .execute();
  }

  private async setGroupPermissionLevel<PermissionLevel extends number>(
    group: GroupEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionLevel: PermissionLevel,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const permissionForGroup = new PermissionForGroupEntity();
    permissionForGroup.objectId = objectId;
    permissionForGroup.objectType = objectType;
    permissionForGroup.permissionLevel = permissionLevel;
    permissionForGroup.groupId = group.id;

    const queryBuilder = transactionalEntityManager
      ? transactionalEntityManager.createQueryBuilder()
      : this.permissionForGroupRepository.createQueryBuilder();
    await queryBuilder
      .insert()
      .into(PermissionForGroupEntity)
      .values(permissionForGroup)
      .orUpdate({ overwrite: ["permissionLevel"] })
      .execute();
  }

  private async revokeUserPermission(
    user?: UserEntity,
    objectId?: number,
    objectType?: PermissionObjectType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const match: FindConditions<PermissionForUserEntity> = {};
    if (objectId) match.objectId = objectId;
    if (objectType) match.objectType = objectType;
    if (user) match.userId = user.id;

    if (transactionalEntityManager) await transactionalEntityManager.delete(PermissionForUserEntity, match);
    else await this.permissionForUserRepository.delete(match);
  }

  private async revokeGroupPermission(
    group?: GroupEntity,
    objectId?: number,
    objectType?: PermissionObjectType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const match: FindConditions<PermissionForGroupEntity> = {};
    if (objectId) match.objectId = objectId;
    if (objectType) match.objectType = objectType;
    if (group) match.groupId = group.id;

    if (transactionalEntityManager) await transactionalEntityManager.delete(PermissionForGroupEntity, match);
    else await this.permissionForGroupRepository.delete(match);
  }

  private async getUserPermissionLevel<PermissionLevel extends number>(
    user: UserEntity,
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<PermissionLevel> {
    const permissionForUser = await this.permissionForUserRepository.findOne({
      objectId,
      objectType,
      userId: user.id
    });
    if (!permissionForUser) return null;
    return permissionForUser.permissionLevel as PermissionLevel;
  }

  private async getGroupPermissionLevel<PermissionLevel extends number>(
    group: GroupEntity,
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<PermissionLevel> {
    const permissionForGroup = await this.permissionForGroupRepository.findOne({
      objectId,
      objectType,
      groupId: group.id
    });
    if (!permissionForGroup) return null;
    return permissionForGroup.permissionLevel as PermissionLevel;
  }

  async setPermissionLevel<PermissionLevel extends number>(
    userOrGroup: UserEntity | GroupEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permission: PermissionLevel,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    if (userOrGroup instanceof UserEntity)
      return await this.setUserPermissionLevel(
        userOrGroup,
        objectId,
        objectType,
        permission,
        transactionalEntityManager
      );
    if (userOrGroup instanceof GroupEntity)
      return await this.setGroupPermissionLevel(
        userOrGroup,
        objectId,
        objectType,
        permission,
        transactionalEntityManager
      );
    throw new Error("userOrGroup is neither a user nor a group");
  }

  async revokePermission(
    userOrGroup: UserEntity | GroupEntity,
    objectId?: number,
    objectType?: PermissionObjectType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    if (userOrGroup instanceof UserEntity)
      return await this.revokeUserPermission(userOrGroup, objectId, objectType, transactionalEntityManager);
    if (userOrGroup instanceof GroupEntity)
      return await this.revokeGroupPermission(userOrGroup, objectId, objectType, transactionalEntityManager);
    throw new Error("userOrGroup is neither a user nor a group");
  }

  async getPermissionLevel<PermissionLevel extends number>(
    userOrGroup: UserEntity | GroupEntity,
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<PermissionLevel> {
    if (userOrGroup instanceof UserEntity) return await this.getUserPermissionLevel(userOrGroup, objectId, objectType);
    if (userOrGroup instanceof GroupEntity)
      return await this.getGroupPermissionLevel(userOrGroup, objectId, objectType);
    throw new Error("userOrGroup is neither a user nor a group");
  }

  async userOrItsGroupsHavePermission<PermissionLevel extends number>(
    user: UserEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionLevelRequired: PermissionLevel
  ): Promise<boolean> {
    if (!user) return false;
    if ((await this.getPermissionLevel(user, objectId, objectType)) >= permissionLevelRequired) return true;

    const groupIdsOfUser = await this.groupService.getGroupIdsByUserId(user.id);
    const queryResult =
      groupIdsOfUser.length > 0 &&
      (await this.permissionForGroupRepository
        .createQueryBuilder()
        .select("MAX(permissionLevel)", "maxPermissionLevel")
        .where("objectId = :objectId AND objectType = :objectType AND groupId IN (:...groupIds)", {
          objectId,
          objectType,
          groupIds: groupIdsOfUser
        })
        .getRawOne());

    return queryResult && queryResult.maxPermissionLevel >= permissionLevelRequired;
  }

  async getUserOrItsGroupsMaxPermissionLevel<PermissionLevel extends number>(
    user: UserEntity,
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<PermissionLevel> {
    const userPermission = await this.getPermissionLevel(user, objectId, objectType);

    const groupIdsOfUser = await this.groupService.getGroupIdsByUserId(user.id);
    const queryResult =
      groupIdsOfUser.length > 0 &&
      (await this.permissionForGroupRepository
        .createQueryBuilder()
        .select("MAX(permissionLevel)", "maxPermissionLevel")
        .where("objectId = :objectId AND objectType = :objectType AND groupId IN (:...groupIds)", {
          objectId,
          objectType,
          groupIds: groupIdsOfUser
        })
        .getRawOne());

    if (!userPermission) return queryResult ? queryResult.maxPermissionLevel : null;
    if (!queryResult) return userPermission as PermissionLevel;
    return Math.max(userPermission, queryResult.maxPermissionLevel) as PermissionLevel;
  }

  async getObjectAccessControlListForUser<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<AccessControlListItemForUser<PermissionLevel>[]> {
    return (
      await this.permissionForUserRepository.find({
        objectId,
        objectType
      })
    ).map(permissionForUser => ({
      userId: permissionForUser.userId,
      permissionLevel: permissionForUser.permissionLevel as PermissionLevel
    }));
  }

  async getObjectAccessControlListForGroup<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<AccessControlListItemForGroup<PermissionLevel>[]> {
    return (
      await this.permissionForGroupRepository.find({
        objectId,
        objectType
      })
    ).map(permissionForGroup => ({
      groupId: permissionForGroup.groupId,
      permissionLevel: permissionForGroup.permissionLevel as PermissionLevel
    }));
  }

  async getAccessControlList<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<AccessControlList<PermissionLevel>> {
    const [userPermissions, groupPermissions] = await Promise.all([
      this.getObjectAccessControlListForUser<PermissionLevel>(objectId, objectType),
      this.getObjectAccessControlListForGroup<PermissionLevel>(objectId, objectType)
    ]);

    return {
      userPermissions,
      groupPermissions
    };
  }

  async getAccessControlListWithSubjectMeta<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType,
    currentUser: UserEntity
  ): Promise<AccessControlListWithSubjectMeta<PermissionLevel>> {
    const [userPermissions, groupPermissions] = await Promise.all([
      this.getObjectAccessControlListForUser<PermissionLevel>(objectId, objectType).then(list =>
        Promise.all(
          list.map(async ({ userId, permissionLevel }) => ({
            user: await this.userService.getUserMeta(await this.userService.findUserById(userId), currentUser),
            permissionLevel
          }))
        )
      ),
      this.getObjectAccessControlListForGroup<PermissionLevel>(objectId, objectType).then(list =>
        Promise.all(
          list.map(async ({ groupId, permissionLevel }) => ({
            group: await this.groupService.getGroupMeta(await this.groupService.findGroupById(groupId)),
            permissionLevel
          }))
        )
      )
    ]);
    return {
      userPermissions,
      groupPermissions
    };
  }

  /**
   * @param acl Set to `null` to delete.
   */
  async setAccessControlList<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType,
    acl: AccessControlList<PermissionLevel>,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const { userPermissions, groupPermissions } = acl || { userPermissions: [], groupPermissions: [] };

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const runInTransaction = async (transactionalEntityManager: EntityManager) => {
      await transactionalEntityManager.delete(PermissionForUserEntity, {
        objectId,
        objectType
      });

      await transactionalEntityManager.delete(PermissionForGroupEntity, {
        objectId,
        objectType
      });

      if (userPermissions.length > 0) {
        await transactionalEntityManager
          .createQueryBuilder()
          .insert()
          .into(PermissionForUserEntity)
          .values(
            userPermissions.map(({ userId, permissionLevel }) => ({
              objectId,
              objectType,
              userId: userId,
              permissionLevel
            }))
          )
          .execute();
      }

      if (groupPermissions.length > 0) {
        await transactionalEntityManager
          .createQueryBuilder()
          .insert()
          .into(PermissionForGroupEntity)
          .values(
            groupPermissions.map(({ groupId, permissionLevel }) => ({
              objectId,
              objectType,
              groupId: groupId,
              permissionLevel
            }))
          )
          .execute();
      }
    };

    if (transactionalEntityManager) await runInTransaction(transactionalEntityManager);
    else await this.connection.transaction("READ COMMITTED", runInTransaction);
  }
}
