import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection, Like } from "typeorm";

import {
  CreateGroupResponseError,
  AddUserToGroupResponseError,
  RemoveUserFromGroupResponseError,
  DeleteGroupResponseError,
  SetGroupAdminResponseError,
  GroupMetaDto
} from "./dto";

import { UserService } from "@/user/user.service";
import { GroupEntity } from "./group.entity";
import { GroupMembershipEntity } from "./group-membership.entity";
import { escapeLike } from "@/database/database.utils";
import { UserEntity } from "@/user/user.entity";

@Injectable()
export class GroupService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(GroupMembershipEntity)
    private readonly groupMembershipRepository: Repository<GroupMembershipEntity>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {}

  async groupExists(id: number): Promise<boolean> {
    return (await this.groupRepository.count({ id: id })) != 0;
  }

  async findGroupById(id: number): Promise<GroupEntity> {
    return await this.groupRepository.findOne(id);
  }

  public async findGroupsByExistingIds(groupIds: number[]): Promise<GroupEntity[]> {
    if (groupIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(groupIds));
    const records = await this.groupRepository.findByIds(uniqueIds);
    const map = Object.fromEntries(records.map(record => [record.id, record]));
    return groupIds.map(groupId => map[groupId]);
  }

  async findGroupMembership(userId: number, groupId: number): Promise<GroupMembershipEntity> {
    return await this.groupMembershipRepository.findOne({
      userId: userId,
      groupId: groupId
    });
  }

  async getGroupMeta(group: GroupEntity): Promise<GroupMetaDto> {
    return {
      id: group.id,
      name: group.name,
      ownerId: group.ownerId,
      memberCount: group.memberCount
    };
  }

  async isGroupAdmin(userId: number, groupId: number): Promise<boolean> {
    return (
      (await this.groupMembershipRepository.count({
        userId: userId,
        groupId: groupId,
        isGroupAdmin: true
      })) != 0
    );
  }

  async getGroupIdsByUserId(userId: number): Promise<number[]> {
    return (
      await this.groupMembershipRepository.find({
        userId: userId
      })
    ).map(memberShip => memberShip.groupId);
  }

  async createGroup(ownerId: number, name: string): Promise<[CreateGroupResponseError, GroupEntity]> {
    try {
      let group: GroupEntity;
      await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        group = new GroupEntity();
        group.name = name;
        group.ownerId = ownerId;
        group.memberCount = 1;
        await transactionalEntityManager.save(group);

        const groupMembership = new GroupMembershipEntity();
        groupMembership.userId = ownerId;
        groupMembership.groupId = group.id;
        groupMembership.isGroupAdmin = false;
        await transactionalEntityManager.save(groupMembership);
      });

      return [null, group];
    } catch (e) {
      if (await this.groupRepository.count({ name: name }))
        return [CreateGroupResponseError.DUPLICATE_GROUP_NAME, null];

      throw e;
    }
  }

  async deleteGroup(id: number, force: boolean): Promise<DeleteGroupResponseError> {
    const group = await this.findGroupById(id);
    if (!group) return DeleteGroupResponseError.NO_SUCH_GROUP;

    if (!force) {
      if (await this.groupMembershipRepository.count({ groupId: id })) {
        return DeleteGroupResponseError.GROUP_NOT_EMPTY;
      }

      // TODO: Check if the group has permission
    }

    await this.groupRepository.delete(group);

    return null;
  }

  async addUserToGroup(userId: number, group: GroupEntity): Promise<AddUserToGroupResponseError> {
    if (!(await this.userService.userExists(userId))) return AddUserToGroupResponseError.NO_SUCH_USER;

    try {
      await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        const groupMembership = new GroupMembershipEntity();
        groupMembership.userId = userId;
        groupMembership.groupId = group.id;
        groupMembership.isGroupAdmin = false;
        await transactionalEntityManager.save(groupMembership);
        await transactionalEntityManager.increment(GroupEntity, { id: group.id }, "memberCount", 1);
      });
    } catch (e) {
      if (
        await this.groupMembershipRepository.count({
          userId: userId,
          groupId: group.id
        })
      ) {
        return AddUserToGroupResponseError.USER_ALREADY_IN_GROUP;
      }

      throw e;
    }

    return null;
  }

  async removeUserFromGroup(userId: number, group: GroupEntity): Promise<RemoveUserFromGroupResponseError> {
    if (!(await this.userService.userExists(userId))) return RemoveUserFromGroupResponseError.NO_SUCH_USER;

    if (userId === group.ownerId) return RemoveUserFromGroupResponseError.OWNER_OR_GROUP_ADMIN_CAN_NOT_BE_REMOVED;

    const groupMembership = await this.findGroupMembership(userId, group.id);

    if (!groupMembership) return RemoveUserFromGroupResponseError.USER_NOT_IN_GROUP;

    if (groupMembership.isGroupAdmin) return RemoveUserFromGroupResponseError.OWNER_OR_GROUP_ADMIN_CAN_NOT_BE_REMOVED;

    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      await transactionalEntityManager.remove(groupMembership);
      await transactionalEntityManager.increment(GroupEntity, { id: group.id }, "memberCount", -1);
    });

    return null;
  }

  async setIsGroupAdmin(userId: number, groupId: number, isGroupAdmin: boolean): Promise<SetGroupAdminResponseError> {
    if (!(await this.userService.userExists(userId))) return SetGroupAdminResponseError.NO_SUCH_USER;
    if (!(await this.groupExists(groupId))) return SetGroupAdminResponseError.NO_SUCH_GROUP;

    const groupMembership = await this.groupMembershipRepository.findOne({
      userId: userId,
      groupId: groupId
    });

    if (!groupMembership) return SetGroupAdminResponseError.USER_NOT_IN_GROUP;

    groupMembership.isGroupAdmin = isGroupAdmin;
    await this.groupMembershipRepository.save(groupMembership);

    return null;
  }

  async searchGroup(query: string, wildcard: "START" | "END" | "BOTH", maxTakeCount: number): Promise<GroupEntity[]> {
    query = escapeLike(query);
    if (wildcard === "START" || wildcard === "BOTH") query = "%" + query;
    if (wildcard === "END" || wildcard === "BOTH") query = query + "%";

    return await this.groupRepository.find({
      where: {
        name: Like(query)
      },
      order: {
        name: "ASC"
      },
      take: maxTakeCount
    });
  }

  async getUserJoinedGroups(user: UserEntity): Promise<[GroupEntity[], number[]]> {
    const groupMemberships = await this.groupMembershipRepository.find({
      userId: user.id
    });
    const groups = await this.findGroupsByExistingIds(groupMemberships.map(groupMembership => groupMembership.groupId));
    return [
      groups,
      groupMemberships
        .filter((groupMembership, i) => groupMembership.isGroupAdmin || groups[i].ownerId == user.id)
        .map(groupMembership => groupMembership.groupId)
    ];
  }

  async getAllGroups(): Promise<GroupEntity[]> {
    return await this.groupRepository.find();
  }

  async getGroupMemberList(group: GroupEntity): Promise<GroupMembershipEntity[]> {
    return await this.groupMembershipRepository.find({
      groupId: group.id
    });
  }
}
