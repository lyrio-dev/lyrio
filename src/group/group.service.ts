import { Injectable } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection } from "typeorm";

import {
  CreateGroupResponseError,
  AddUserToGroupResponseError,
  RemoveUserFromGroupResponseError,
  DeleteGroupResponseError,
  SetGroupAdminResponseError
} from "./dto";

import { UserService } from "@/user/user.service";
import { GroupEntity } from "./group.entity";
import { GroupMembershipEntity } from "./group-membership.entity";

@Injectable()
export class GroupService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(GroupMembershipEntity)
    private readonly groupMembershipRepository: Repository<
      GroupMembershipEntity
    >,
    private readonly userService: UserService
  ) {}

  async groupExists(id: number): Promise<boolean> {
    return (await this.groupRepository.count({ id: id })) != 0;
  }

  async findGroupById(id: number): Promise<GroupEntity> {
    return await this.groupRepository.findOne(id);
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

  async findMembersipsByUserId(
    userId: number
  ): Promise<[GroupMembershipEntity, GroupEntity][]> {
    const memberships = await this.groupMembershipRepository.find({
      userId: userId
    });

    return Promise.all(
      memberships.map(
        async (membership): Promise<[GroupMembershipEntity, GroupEntity]> => [
          membership,
          await membership.group
        ]
      )
    );
  }

  async createGroup(
    ownerId: number,
    name: string
  ): Promise<[CreateGroupResponseError, GroupEntity]> {
    try {
      let group: GroupEntity;
      await this.connection.transaction(
        "SERIALIZABLE",
        async transactionalEntityManager => {
          group = new GroupEntity();
          group.name = name;
          group.ownerId = ownerId;
          await transactionalEntityManager.save(group);

          const groupMembership = new GroupMembershipEntity();
          groupMembership.userId = ownerId;
          groupMembership.groupId = group.id;
          groupMembership.isGroupAdmin = false;
          await transactionalEntityManager.save(groupMembership);
        }
      );

      return [null, group];
    } catch (e) {
      if (await this.groupRepository.count({ name: name }))
        return [CreateGroupResponseError.DUPLICATE_GROUP_NAME, null];

      throw e;
    }
  }

  async deleteGroup(
    id: number,
    force: boolean
  ): Promise<DeleteGroupResponseError> {
    const group = await this.groupRepository.findOne(id);
    if (!group) return DeleteGroupResponseError.NO_SUCH_GROUP;

    if (!force) {
      if (await this.groupMembershipRepository.count({ groupId: id })) {
        return DeleteGroupResponseError.GROUP_NOT_EMPTY;
      }

      // TODO: Check if the group has privilige
    }

    await this.groupRepository.delete(group);

    return null;
  }

  async addUserToGroup(
    userId: number,
    group: GroupEntity
  ): Promise<AddUserToGroupResponseError> {
    if (!(await this.userService.userExists(userId)))
      return AddUserToGroupResponseError.NO_SUCH_USER;

    try {
      const groupMembership = new GroupMembershipEntity();
      groupMembership.userId = userId;
      groupMembership.groupId = group.id;
      groupMembership.isGroupAdmin = false;
      await this.groupMembershipRepository.save(groupMembership);
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

  async removeUserFromGroup(
    userId: number,
    group: GroupEntity
  ): Promise<RemoveUserFromGroupResponseError> {
    if (!(await this.userService.userExists(userId)))
      return RemoveUserFromGroupResponseError.NO_SUCH_USER;

    if (userId === group.ownerId)
      return RemoveUserFromGroupResponseError.OWNER_OR_GROUP_ADMIN_CAN_NOT_BE_REMOVED;

    const groupMembership = await this.groupMembershipRepository.findOne({
      userId: userId,
      groupId: group.id
    });

    if (!groupMembership)
      return RemoveUserFromGroupResponseError.USER_NOT_IN_GROUP;

    if (groupMembership.isGroupAdmin)
      return RemoveUserFromGroupResponseError.OWNER_OR_GROUP_ADMIN_CAN_NOT_BE_REMOVED;

    await this.groupMembershipRepository.delete(groupMembership);

    return null;
  }
}
