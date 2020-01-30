import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, EntityManager, Connection } from "typeorm";

import { PermissionForUserEntity } from "./permission-for-user.entity";
import { PermissionForGroupEntity } from "./permission-for-group.entity";
import { PermissionObjectType } from "./permission-object-type.enum";
import { PermissionType } from "./permission-type.enum";

import { UserEntity } from "@/user/user.entity";
import { GroupEntity } from "@/group/group.entity";

import { GroupService } from "@/group/group.service";

export { PermissionObjectType } from "./permission-object-type.enum";
export { PermissionType } from "./permission-type.enum";

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

  private async ensurePermissionForUser(
    user: UserEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const permissionForUser = new PermissionForUserEntity();
    permissionForUser.objectId = objectId;
    permissionForUser.objectType = objectType;
    permissionForUser.permissionType = permissionType;
    permissionForUser.userId = user.id;

    const queryBuilder = transactionalEntityManager
      ? transactionalEntityManager.createQueryBuilder()
      : this.permissionForUserRepository.createQueryBuilder();
    await queryBuilder
      .insert()
      .into(PermissionForUserEntity)
      .values(permissionForUser)
      .orUpdate({ overwrite: ["permissionType"] }) // ON DUPLICATE KEY "IGNORE"
      .execute();
  }

  private async ensurePermissionForGroup(
    group: GroupEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const permissionForGroup = new PermissionForGroupEntity();
    permissionForGroup.objectId = objectId;
    permissionForGroup.objectType = objectType;
    permissionForGroup.permissionType = permissionType;
    permissionForGroup.groupId = group.id;

    const queryBuilder = transactionalEntityManager
      ? transactionalEntityManager.createQueryBuilder()
      : this.permissionForGroupRepository.createQueryBuilder();
    await queryBuilder
      .insert()
      .into(PermissionForGroupEntity)
      .values(permissionForGroup)
      .orUpdate({ overwrite: ["permissionType"] }) // ON DUPLICATE KEY "IGNORE"
      .execute();
  }

  private async revokePermissionForUser(
    user?: UserEntity,
    objectId?: number,
    objectType?: PermissionObjectType,
    permissionType?: PermissionType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const match: any = {};
    if (objectId) match.objectId = objectId;
    if (objectType) match.objectType = objectType;
    if (permissionType) match.permissionType = permissionType;
    if (user) match.userId = user.id;

    if (transactionalEntityManager) await transactionalEntityManager.delete(PermissionForUserEntity, match);
    else await this.permissionForUserRepository.delete(match);
  }

  private async revokePermissionForGroup(
    group?: GroupEntity,
    objectId?: number,
    objectType?: PermissionObjectType,
    permissionType?: PermissionType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const match: any = {};
    if (objectId) match.objectId = objectId;
    if (objectType) match.objectType = objectType;
    if (permissionType) match.permissionType = permissionType;
    if (group) match.groupId = group.id;

    if (transactionalEntityManager) await transactionalEntityManager.delete(PermissionForGroupEntity, match);
    else await this.permissionForGroupRepository.delete(match);
  }

  private async userHasPermission(
    user: UserEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType
  ): Promise<boolean> {
    return (
      (await this.permissionForUserRepository.count({
        objectId: objectId,
        objectType: objectType,
        permissionType: permissionType,
        userId: user.id
      })) != 0
    );
  }

  private async groupHasPermission(
    group: GroupEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType
  ): Promise<boolean> {
    return (
      (await this.permissionForGroupRepository.count({
        objectId: objectId,
        objectType: objectType,
        permissionType: permissionType,
        groupId: group.id
      })) != 0
    );
  }

  async ensurePermission(
    userOrGroup: UserEntity | GroupEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    if (userOrGroup instanceof UserEntity)
      return await this.ensurePermissionForUser(
        userOrGroup,
        objectId,
        objectType,
        permissionType,
        transactionalEntityManager
      );
    else if (userOrGroup instanceof GroupEntity)
      return await this.ensurePermissionForGroup(
        userOrGroup,
        objectId,
        objectType,
        permissionType,
        transactionalEntityManager
      );
    else throw new Error("userOrGroup is neither a user nor a group");
  }

  async revokePermission(
    userOrGroup: UserEntity | GroupEntity,
    objectId?: number,
    objectType?: PermissionObjectType,
    permissionType?: PermissionType,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    if (userOrGroup instanceof UserEntity)
      return await this.revokePermissionForUser(
        userOrGroup,
        objectId,
        objectType,
        permissionType,
        transactionalEntityManager
      );
    else if (userOrGroup instanceof GroupEntity)
      return await this.revokePermissionForGroup(
        userOrGroup,
        objectId,
        objectType,
        permissionType,
        transactionalEntityManager
      );
    else throw new Error("userOrGroup is neither a user nor a group");
  }

  async hasPermission(
    userOrGroup: UserEntity | GroupEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType
  ): Promise<boolean> {
    if (userOrGroup instanceof UserEntity)
      return await this.userHasPermission(userOrGroup, objectId, objectType, permissionType);
    else if (userOrGroup instanceof GroupEntity)
      return await this.groupHasPermission(userOrGroup, objectId, objectType, permissionType);
    else throw new Error("userOrGroup is neither a user nor a group");
  }

  async userOrItsGroupsHavePermission(
    user: UserEntity,
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType
  ): Promise<boolean> {
    if (await this.hasPermission(user, objectId, objectType, permissionType)) return true;

    const groupIdsWithPermission = await this.getGroupsWithPermission(objectId, objectType, permissionType);
    const groupIdsOfUser = await this.groupService.getGroupIdsByUserId(user.id);
    return groupIdsOfUser.some(groupId => groupIdsWithPermission.includes(groupId));
  }

  async getUsersWithPermission(
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType
  ): Promise<number[]> {
    return (
      await this.permissionForUserRepository.find({
        objectId: objectId,
        objectType: objectType,
        permissionType: permissionType
      })
    ).map(permissionForUser => permissionForUser.userId);
  }

  async getGroupsWithPermission(
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType
  ): Promise<number[]> {
    return (
      await this.permissionForGroupRepository.find({
        objectId: objectId,
        objectType: objectType,
        permissionType: permissionType
      })
    ).map(permissionForGroup => permissionForGroup.groupId);
  }

  async getUsersAndGroupsWithPermission(
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType
  ): Promise<[number[], number[]]> {
    return [
      await this.getUsersWithPermission(objectId, objectType, permissionType),
      await this.getGroupsWithPermission(objectId, objectType, permissionType)
    ];
  }

  async replaceUsersAndGroupsPermissionForObject(
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType,
    users: UserEntity[],
    groups: GroupEntity[],
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const runInTransaction = async (transactionalEntityManager: EntityManager) => {
      await transactionalEntityManager.delete(PermissionForUserEntity, {
        objectId: objectId,
        objectType: objectType,
        permissionType: permissionType
      });

      await transactionalEntityManager.delete(PermissionForGroupEntity, {
        objectId: objectId,
        objectType: objectType,
        permissionType: permissionType
      });

      for (const user of users)
        await this.ensurePermissionForUser(user, objectId, objectType, permissionType, transactionalEntityManager);
      for (const group of groups)
        await this.ensurePermissionForGroup(group, objectId, objectType, permissionType, transactionalEntityManager);
    };

    if (transactionalEntityManager) runInTransaction(transactionalEntityManager);
    else this.connection.transaction("READ COMMITTED", runInTransaction);
  }

  async userHasAnyPermission(user: UserEntity): Promise<boolean> {
    return (
      (await this.permissionForUserRepository.count({
        userId: user.id
      })) != 0
    );
  }

  async groupHasAnyPermission(group: GroupEntity): Promise<boolean> {
    return (
      (await this.permissionForGroupRepository.count({
        groupId: group.id
      })) != 0
    );
  }
}
