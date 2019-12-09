import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";

import { PermissionForUserEntity } from "./permission-for-user.entity";
import { PermissionForGroupEntity } from "./permission-for-group.entity";
import { PermissionObjectType } from "./permission-object-type.enum";
import { PermissionType } from "./permission-type.enum";

import { UserEntity } from "@/user/user.entity";
import { GroupEntity } from "@/group/group.entity";

export { PermissionObjectType } from "./permission-object-type.enum";

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionForUserEntity)
    private readonly permissionForUserRepository: Repository<
      PermissionForUserEntity
    >,
    @InjectRepository(PermissionForGroupEntity)
    private readonly permissionForGroupRepository: Repository<
      PermissionForGroupEntity
    >
  ) {}

  private async ensurePermissionForUser(
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType,
    user: UserEntity,
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
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType,
    group: GroupEntity,
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
    objectId?: number,
    objectType?: PermissionObjectType,
    permissionType?: PermissionType,
    user?: UserEntity,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const match: any = {};
    if (objectId) match.objectId = objectId;
    if (objectType) match.objectType = objectType;
    if (permissionType) match.permissionType = permissionType;
    if (user) match.userId = user.id;

    if (transactionalEntityManager)
      await transactionalEntityManager.delete(PermissionForUserEntity, match);
    else await this.permissionForUserRepository.delete(match);
  }

  private async revokePermissionForGroup(
    objectId?: number,
    objectType?: PermissionObjectType,
    permissionType?: PermissionType,
    group?: GroupEntity,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const match: any = {};
    if (objectId) match.objectId = objectId;
    if (objectType) match.objectType = objectType;
    if (permissionType) match.permissionType = permissionType;
    if (group) match.groupId = group.id;

    if (transactionalEntityManager)
      await transactionalEntityManager.delete(PermissionForGroupEntity, match);
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
    objectId: number,
    objectType: PermissionObjectType,
    permissionType: PermissionType,
    userOrGroup: UserEntity | GroupEntity,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    if (userOrGroup instanceof UserEntity)
      return await this.ensurePermissionForUser(
        objectId,
        objectType,
        permissionType,
        userOrGroup,
        transactionalEntityManager
      );
    else if (userOrGroup instanceof GroupEntity)
      return await this.ensurePermissionForGroup(
        objectId,
        objectType,
        permissionType,
        userOrGroup,
        transactionalEntityManager
      );
    else throw new Error("userOrGroup is neither a user nor a group");
  }

  async revokePermission(
    objectId?: number,
    objectType?: PermissionObjectType,
    permissionType?: PermissionType,
    userOrGroup?: UserEntity | GroupEntity,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    if (userOrGroup instanceof UserEntity)
      return await this.revokePermissionForUser(
        objectId,
        objectType,
        permissionType,
        userOrGroup,
        transactionalEntityManager
      );
    else if (userOrGroup instanceof GroupEntity)
      return await this.revokePermissionForGroup(
        objectId,
        objectType,
        permissionType,
        userOrGroup,
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
      return await this.userHasPermission(
        userOrGroup,
        objectId,
        objectType,
        permissionType
      );
    else if (userOrGroup instanceof GroupEntity)
      return await this.groupHasPermission(
        userOrGroup,
        objectId,
        objectType,
        permissionType
      );
    else throw new Error("userOrGroup is neither a user nor a group");
  }

  async getUsersWithPermission(objectId: number, objectType: PermissionObjectType, permissionType: PermissionType): Promise<number[]> {
    return (await this.permissionForUserRepository.find({
      objectId: objectId,
      objectType: objectType,
      permissionType: permissionType
    })).map(permissionForUser => permissionForUser.userId);
  }

  async getGroupsWithPermission(objectId: number, objectType: PermissionObjectType, permissionType: PermissionType): Promise<number[]> {
    return (await this.permissionForGroupRepository.find({
      objectId: objectId,
      objectType: objectType,
      permissionType: permissionType
    })).map(permissionForGroup => permissionForGroup.groupId);
  }
}
