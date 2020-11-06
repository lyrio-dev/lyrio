import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";

import { Repository, EntityManager, Connection, FindConditions } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { GroupEntity } from "@/group/group.entity";
import { GroupService } from "@/group/group.service";

import { PermissionForUserEntity } from "./permission-for-user.entity";
import { PermissionForGroupEntity } from "./permission-for-group.entity";
import { PermissionObjectType } from "./permission-object-type.enum";

export { PermissionObjectType } from "./permission-object-type.enum";

@Injectable()
export class PermissionService {
  constructor(
    @InjectConnection()
    private connection: Connection,
    @InjectRepository(PermissionForUserEntity)
    private readonly permissionForUserRepository: Repository<PermissionForUserEntity>,
    @InjectRepository(PermissionForGroupEntity)
    private readonly permissionForGroupRepository: Repository<PermissionForGroupEntity>,
    private readonly groupService: GroupService
  ) {}

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

  async getUsersWithExactPermissionLevel<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType,
    permissionLevel: PermissionLevel
  ): Promise<number[]> {
    return (
      await this.permissionForUserRepository.find({
        objectId,
        objectType,
        permissionLevel
      })
    ).map(permissionForUser => permissionForUser.userId);
  }

  async getGroupsWithExactPermissionLevel<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType,
    permissionLevel: PermissionLevel
  ): Promise<number[]> {
    return (
      await this.permissionForGroupRepository.find({
        objectId,
        objectType,
        permissionLevel
      })
    ).map(permissionForGroup => permissionForGroup.groupId);
  }

  async getUsersAndGroupsWithExactPermissionLevel<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType,
    permissionLevel: PermissionLevel
  ): Promise<[userIds: number[], groupIds: number[]]> {
    return [
      await this.getUsersWithExactPermissionLevel(objectId, objectType, permissionLevel),
      await this.getGroupsWithExactPermissionLevel(objectId, objectType, permissionLevel)
    ];
  }

  async getUserPermissionListOfObject<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<[userId: number, permissionLevel: PermissionLevel][]> {
    return (
      await this.permissionForUserRepository.find({
        objectId,
        objectType
      })
    ).map(permissionForUser => [permissionForUser.userId, permissionForUser.permissionLevel as PermissionLevel]);
  }

  async getGroupPermissionListOfObject<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<[groupId: number, permissionLevel: PermissionLevel][]> {
    return (
      await this.permissionForGroupRepository.find({
        objectId,
        objectType
      })
    ).map(permissionForGroup => [permissionForGroup.groupId, permissionForGroup.permissionLevel as PermissionLevel]);
  }

  async getUserAndGroupPermissionListOfObject<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType
  ): Promise<
    [[userId: number, permissionLevel: PermissionLevel][], [groupId: number, permissionLevel: PermissionLevel][]]
  > {
    return [
      await this.getUserPermissionListOfObject(objectId, objectType),
      await this.getGroupPermissionListOfObject(objectId, objectType)
    ];
  }

  async replaceUsersAndGroupsPermissionForObject<PermissionLevel extends number>(
    objectId: number,
    objectType: PermissionObjectType,
    userPermissions: [UserEntity, PermissionLevel][],
    groupPermissions: [GroupEntity, PermissionLevel][],
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
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
            userPermissions.map(([user, permissionLevel]) => ({
              objectId,
              objectType,
              userId: user.id,
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
            groupPermissions.map(([group, permissionLevel]) => ({
              objectId,
              objectType,
              groupId: group.id,
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
