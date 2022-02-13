import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";

import { Repository, Connection, EntityManager, Brackets } from "typeorm";

import { UserService } from "@/user/user.service";
import { UserEntity } from "@/user/user.entity";
import { AuditLogObjectType, AuditService } from "@/audit/audit.service";
import { ConfigService } from "@/config/config.service";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { PermissionObjectType, PermissionService } from "@/permission/permission.service";
import { GroupEntity } from "@/group/group.entity";
import { GroupService } from "@/group/group.service";
import { ProblemEntity } from "@/problem/problem.entity";
import { LockService } from "@/redis/lock.service";
import { escapeLike } from "@/database/database.utils";
import { ProblemPermissionType, ProblemService } from "@/problem/problem.service";

import { DiscussionEntity } from "./discussion.entity";
import { DiscussionContentEntity } from "./discussion-content.entity";
import { DiscussionReplyEntity } from "./discussion-reply.entity";
import { DiscussionReactionEntity } from "./discussion-reaction.entity";
import { DiscussionReplyReactionEntity } from "./discussion-reply-reaction.entity";

import { DiscussionMetaDto } from "./dto";

export enum DiscussionReactionType {
  Discussion = "Discussion",
  DiscussionReply = "DiscussionReply"
}

export enum DiscussionPermissionType {
  View = "View",
  Modify = "Modify",
  ManagePermission = "ManagePermission",
  ManagePublicness = "ManagePublicness",
  Delete = "Delete"
}

export enum DiscussionPermissionLevel {
  Read = 1,
  Write = 2
}

export enum DiscussionReplyPermissionType {
  Modify = "Modify",
  ManagePublicness = "ManagePublicness",
  Delete = "Delete"
}

type GetReactionsResult = [reactionsCount: Record<string, number>, currentUserReactions: string[]];

@Injectable()
export class DiscussionService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(DiscussionEntity)
    private readonly discussionRepository: Repository<DiscussionEntity>,
    @InjectRepository(DiscussionContentEntity)
    private readonly discussionContentRepository: Repository<DiscussionContentEntity>,
    @InjectRepository(DiscussionReplyEntity)
    private readonly discussionReplyRepository: Repository<DiscussionReplyEntity>,
    @InjectRepository(DiscussionReactionEntity)
    private readonly discussionReactionRepository: Repository<DiscussionReactionEntity>,
    @InjectRepository(DiscussionReplyReactionEntity)
    private readonly discussionReplyReactionRepository: Repository<DiscussionReplyReactionEntity>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly permissionService: PermissionService,
    private readonly problemService: ProblemService,
    private readonly lockService: LockService
  ) {
    this.auditService.registerObjectTypeQueryHandler(AuditLogObjectType.Discussion, async discussionId => {
      const discussion = await this.findDiscussionById(discussionId);
      return !discussion ? null : await this.getDiscussionMeta(discussion);
    });

    this.auditService.registerObjectTypeQueryHandler(AuditLogObjectType.DiscussionReply, async discussionReplyId => {
      const discussionReply = await this.findDiscussionReplyById(discussionReplyId);
      // Just use entity as DTO?
      return discussionReply;
    });
  }

  async discussionExists(id: number): Promise<boolean> {
    return (await this.discussionRepository.count({ id })) !== 0;
  }

  async discussionReplyExists(id: number): Promise<boolean> {
    return (await this.discussionReplyRepository.count({ id })) !== 0;
  }

  async findDiscussionById(id: number): Promise<DiscussionEntity> {
    return await this.discussionRepository.findOne(id);
  }

  async findDiscussionReplyById(id: number): Promise<DiscussionReplyEntity> {
    return await this.discussionReplyRepository.findOne(id);
  }

  async findDiscussionsByExistingIds(discussionIds: number[]): Promise<DiscussionEntity[]> {
    if (discussionIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(discussionIds));
    const records = await this.discussionRepository.findByIds(uniqueIds);
    const map = Object.fromEntries(records.map(record => [record.id, record]));
    return discussionIds.map(discussionId => map[discussionId]);
  }

  async getDiscussionMeta(discussion: DiscussionEntity): Promise<DiscussionMetaDto> {
    return {
      id: discussion.id,
      title: discussion.title,
      publishTime: discussion.publishTime,
      editTime: discussion.editTime,
      sortTime: discussion.sortTime,
      replyCount: discussion.replyCount,
      isPublic: discussion.isPublic,
      publisherId: discussion.publisherId,
      problemId: discussion.problemId
    };
  }

  async userHasPermission(
    user: UserEntity,
    discussion: DiscussionEntity,
    type: DiscussionPermissionType,
    discussionProblem?: ProblemEntity
  ): Promise<boolean> {
    const hasViewProblemPermission = async () => {
      if (discussion.problemId) {
        if (!discussionProblem) discussionProblem = await this.problemService.findProblemById(discussion.problemId);
        return await this.problemService.userHasPermission(user, discussionProblem, ProblemPermissionType.View);
      }
      return true;
    };

    switch (type) {
      // Everyone can view a public discussion
      // Owner, admins and those who has read permission can view a non-public discussion
      case DiscussionPermissionType.View:
        if (discussion.isPublic) return true;
        if (user && user.id === discussion.publisherId) return true;
        if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion)) return true;
        else
          return (
            await Promise.all([
              hasViewProblemPermission(),
              this.permissionService.userOrItsGroupsHavePermission(
                user,
                discussion.id,
                PermissionObjectType.Discussion,
                DiscussionPermissionLevel.Read
              )
            ])
          ).every(f => f);

      // Owner, admins and those who has write permission can modify a discussion
      case DiscussionPermissionType.Modify:
        if (user && user.id === discussion.publisherId) return true;
        if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion)) return true;
        else
          return (
            await Promise.all([
              hasViewProblemPermission(),
              this.permissionService.userOrItsGroupsHavePermission(
                user,
                discussion.id,
                PermissionObjectType.Discussion,
                DiscussionPermissionLevel.Write
              )
            ])
          ).every(f => f);

      // Admins can manage a discussion's permission
      case DiscussionPermissionType.ManagePermission:
        if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion)) return true;
        else return false;

      // Admins can manage a discussion's publicness
      case DiscussionPermissionType.ManagePublicness:
        if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion)) return true;
        else return false;

      // Admins and the publisher can delete a discussion
      case DiscussionPermissionType.Delete:
        if (user && user.id === discussion.publisherId) return true;
        else if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion))
          return true;
        else return false;

      default:
        return false;
    }
  }

  async getUserPermissionsOfDiscussion(
    user: UserEntity,
    discussion: DiscussionEntity,
    hasPrivilege?: boolean
  ): Promise<DiscussionPermissionType[]> {
    if (!user) return discussion.isPublic ? [DiscussionPermissionType.View] : [];
    if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion)))
      return Object.values(DiscussionPermissionType);

    const permissionLevel =
      await this.permissionService.getUserOrItsGroupsMaxPermissionLevel<DiscussionPermissionLevel>(
        user,
        discussion.id,
        PermissionObjectType.Discussion
      );
    const result: DiscussionPermissionType[] = [];
    if (discussion.isPublic || permissionLevel >= DiscussionPermissionLevel.Read || discussion.publisherId === user.id)
      result.push(DiscussionPermissionType.View);
    if (permissionLevel >= DiscussionPermissionLevel.Write || discussion.publisherId === user.id)
      result.push(DiscussionPermissionType.Modify);
    if (discussion.publisherId === user.id) result.push(DiscussionPermissionType.Delete);

    return result;
  }

  async userHasModifyDiscussionReplyPermission(
    user: UserEntity,
    discussionReply: DiscussionReplyEntity,
    hasPrivilege?: boolean
  ): Promise<boolean> {
    return (
      user &&
      (discussionReply.publisherId === user.id ||
        (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion))))
    );
  }

  async getUserPermissionsOfReply(
    user: UserEntity,
    discussionReply: DiscussionReplyEntity,
    hasPrivilege?: boolean
  ): Promise<DiscussionReplyPermissionType[]> {
    if (!user) return [];
    if (hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion)))
      return Object.values(DiscussionReplyPermissionType);
    if (user.id === discussionReply.publisherId)
      return [DiscussionReplyPermissionType.Modify, DiscussionReplyPermissionType.Delete];
    return [];
  }

  async userHasCreateDiscussionPermission(user: UserEntity, hasPrivilege?: boolean): Promise<boolean> {
    if (!user) return false;
    if (this.configService.config.preference.security.allowEveryoneCreateDiscussion) return true;
    return hasPrivilege ?? (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageDiscussion));
  }

  async createDiscussion(
    publisher: UserEntity,
    title: string,
    content: string,
    problem: ProblemEntity
  ): Promise<DiscussionEntity> {
    return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const now = new Date();

      const discussion = new DiscussionEntity();
      discussion.title = title;
      discussion.publishTime = now;
      discussion.sortTime = now;
      discussion.replyCount = 0;
      discussion.isPublic = this.configService.config.preference.security.discussionDefaultPublic;
      discussion.publisherId = publisher.id;
      discussion.problemId = problem?.id;
      await transactionalEntityManager.save(discussion);

      const discussionContent = new DiscussionContentEntity();
      discussionContent.discussionId = discussion.id;
      discussionContent.content = content;
      await transactionalEntityManager.save(discussionContent);

      return discussion;
    });
  }

  async setDiscussionPublic(discussion: DiscussionEntity, isPublic: boolean): Promise<void> {
    discussion.isPublic = isPublic;
    await this.discussionRepository.save(discussion);
  }

  async updateDiscussionTitleAndContent(
    discussion: DiscussionEntity,
    newTitle: string,
    newContent: string
  ): Promise<void> {
    return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      discussion.title = newTitle;
      discussion.editTime = new Date();
      await transactionalEntityManager.save(discussion);

      const discussionContent = await transactionalEntityManager.findOne(DiscussionContentEntity, {
        discussionId: discussion.id
      });
      discussionContent.content = newContent;
      await transactionalEntityManager.save(discussionContent);

      await this.updateSortTime(discussion.id, transactionalEntityManager, discussion.editTime);
    });
  }

  async getDiscussionContent(discussion: DiscussionEntity): Promise<string> {
    const discussionContent = await this.discussionContentRepository.findOne({ discussionId: discussion.id });
    return discussionContent.content;
  }

  /**
   * Query discussions with pagination.
   *
   * If the user has manage discussion privilege, show all discussions.
   * If the user has no manage discussion privilege, show only public and the user owned discussions.
   *
   * @param problemId `null` for global only and `-1` for ALL problems.
   */
  async queryDiscussionsAndCount(
    currentUser: UserEntity,
    hasPrivilege: boolean,
    keyword: string,
    problemId: number,
    publisherId: number,
    nonpublic: boolean,
    skipCount: number,
    takeCount: number
  ): Promise<[discussions: DiscussionEntity[], count: number]> {
    const queryBuilder = this.discussionRepository.createQueryBuilder("discussion").select("discussion.id", "id");

    if (keyword) queryBuilder.andWhere("discussion.title LIKE :like", { like: `%${escapeLike(keyword)}%` });

    if (problemId == null) queryBuilder.andWhere("discussion.problemId IS NULL");
    else if (problemId === -1) queryBuilder.andWhere("discussion.problemId IS NOT NULL");
    else queryBuilder.andWhere("discussion.problemId = :problemId", { problemId });

    if (!hasPrivilege && !(currentUser && publisherId === currentUser.id)) {
      if (currentUser)
        queryBuilder.andWhere(
          new Brackets(brackets =>
            brackets
              .where("discussion.isPublic = 1")
              .orWhere("discussion.publisherId = :publisherId", { publisherId: currentUser.id })
          )
        );
      else queryBuilder.andWhere("discussion.isPublic = 1");
    } else if (nonpublic) queryBuilder.andWhere("discussion.isPublic = 0");

    if (publisherId) queryBuilder.andWhere("discussion.publisherId = :publisherId", { publisherId });

    queryBuilder.orderBy("discussion.sortTime", "DESC");

    const count = await queryBuilder.getCount();
    const result = await queryBuilder.limit(takeCount).offset(skipCount).getRawMany();

    return [await this.findDiscussionsByExistingIds(result.map(row => row.id)), count];
  }

  private getDiscussionRepliesQueryBuilder(
    currentUser: UserEntity,
    discussion: DiscussionEntity,
    hasPrivilege: boolean,
    order: "ASC" | "DESC" = "ASC",
    transactionalEntityManager: EntityManager = null
  ) {
    const queryBuilder =
      transactionalEntityManager === undefined
        ? transactionalEntityManager.createQueryBuilder().select().from(DiscussionReplyEntity, "reply")
        : this.discussionReplyRepository.createQueryBuilder("reply").select();

    queryBuilder.where("reply.discussionId = :discussionId", { discussionId: discussion.id });

    if (!hasPrivilege) {
      if (currentUser)
        queryBuilder.andWhere(
          new Brackets(brackets =>
            brackets.where("reply.isPublic = 1").orWhere("reply.publisher = :publisher", { publisher: currentUser.id })
          )
        );
      else queryBuilder.andWhere("reply.isPublic = 1");
    }

    queryBuilder.orderBy("reply.id", order);

    return queryBuilder;
  }

  async queryDiscussionRepliesInIdRange(
    currentUser: UserEntity,
    discussion: DiscussionEntity,
    hasPrivilege: boolean,
    afterId: number,
    beforeId: number,
    takeCount: number
  ): Promise<[replies: DiscussionReplyEntity[], count: number]> {
    return await this.getDiscussionRepliesQueryBuilder(currentUser, discussion, hasPrivilege)
      .andWhere("reply.id > :beforeId", { beforeId })
      .andWhere("reply.id < :afterId", { afterId })
      .take(takeCount)
      .getManyAndCount();
  }

  async queryDiscussionRepliesByHeadTail(
    currentUser: UserEntity,
    discussion: DiscussionEntity,
    hasPrivilege: boolean,
    headTakeCount: number,
    tailTakeCount: number
  ): Promise<[head: DiscussionReplyEntity[], tail: DiscussionReplyEntity[], count: number]> {
    const [head, count] = await this.getDiscussionRepliesQueryBuilder(currentUser, discussion, hasPrivilege, "ASC")
      .take(headTakeCount)
      .getManyAndCount();

    if (count <= headTakeCount) return [head, [], count];

    const tail = await this.getDiscussionRepliesQueryBuilder(currentUser, discussion, hasPrivilege, "DESC")
      .take(Math.min(tailTakeCount, count - headTakeCount))
      .getMany();

    // Remove possible duplications
    const headIds = head.map(reply => reply.id);

    return [head, tail.filter(reply => !headIds.includes(reply.id)).reverse(), count];
  }

  /**
   * Lock a discussion by ID with Read/Write Lock.
   * @param type `"Read"` to ensure the problem exists while holding the lock, `"Write"` is for deleting the problem.
   */
  async lockDiscussionById<T>(
    id: number,
    type: "Read" | "Write",
    callback: (discussion: DiscussionEntity) => Promise<T>
  ): Promise<T> {
    return await this.lockService.lockReadWrite(
      `AcquireDiscussion_${id}`,
      type,
      async () => await callback(await this.findDiscussionById(id))
    );
  }

  async setDiscussionPermissions(
    discussion: DiscussionEntity,
    userPermissions: [user: UserEntity, permission: DiscussionPermissionLevel][],
    groupPermissions: [group: GroupEntity, permission: DiscussionPermissionLevel][]
  ): Promise<void> {
    await this.lockDiscussionById(
      discussion.id,
      "Read",
      // eslint-disable-next-line @typescript-eslint/no-shadow
      async discussion =>
        await this.permissionService.replaceUsersAndGroupsPermissionForObject(
          discussion.id,
          PermissionObjectType.Discussion,
          userPermissions,
          groupPermissions
        )
    );
  }

  async getDiscussionPermissionsWithId(
    discussion: DiscussionEntity
  ): Promise<
    [
      [userId: number, permission: DiscussionPermissionLevel][],
      [groupId: number, permission: DiscussionPermissionLevel][]
    ]
  > {
    return await this.permissionService.getUserAndGroupPermissionListOfObject<DiscussionPermissionLevel>(
      discussion.id,
      PermissionObjectType.Discussion
    );
  }

  async getDiscussionPermissions(
    discussion: DiscussionEntity
  ): Promise<
    [
      [user: UserEntity, permission: DiscussionPermissionLevel][],
      [group: GroupEntity, permission: DiscussionPermissionLevel][]
    ]
  > {
    const [userPermissionList, groupPermissionList] = await this.getDiscussionPermissionsWithId(discussion);
    return [
      await Promise.all(
        userPermissionList.map(
          async ([userId, permission]): Promise<[user: UserEntity, permission: DiscussionPermissionLevel]> => [
            await this.userService.findUserById(userId),
            permission
          ]
        )
      ),
      await Promise.all(
        groupPermissionList.map(
          async ([groupId, permission]): Promise<[group: GroupEntity, discussion: DiscussionPermissionLevel]> => [
            await this.groupService.findGroupById(groupId),
            permission
          ]
        )
      )
    ];
  }

  private async updateSortTime(discussionId: number, transactionalEntityManager: EntityManager, editTime?: Date) {
    const [queryResultMaxReplyTime, queryResultPublishOrEditTime] = await Promise.all([
      transactionalEntityManager
        .createQueryBuilder()
        .select("MAX(reply.publishTime)", "maxReplyTime")
        .from(DiscussionReplyEntity, "reply")
        .where("reply.discussionId = :discussionId", { discussionId })
        .getRawOne<{ maxReplyTime: Date }>(),
      !editTime &&
        transactionalEntityManager
          .createQueryBuilder()
          .select("IFNULL(discussion.editTime, discussion.publishTime)", "publishOrEditTime")
          .from(DiscussionEntity, "discussion")
          .where("discussion.id = :discussionId", { discussionId })
          .getRawOne<{ publishOrEditTime: Date }>()
    ]);

    await transactionalEntityManager
      .createQueryBuilder()
      .update(DiscussionEntity)
      .set({
        sortTime: new Date(
          Math.max(
            +(queryResultMaxReplyTime?.maxReplyTime || 0),
            +(editTime || queryResultPublishOrEditTime.publishOrEditTime)
          )
        )
      })
      .where("id = :discussionId")
      .setParameters({
        discussionId
      })
      .execute();
  }

  private async updateReplyCount(
    discussionId: number,
    incReplyCount: number,
    transactionalEntityManager: EntityManager
  ) {
    await transactionalEntityManager.increment(DiscussionEntity, { id: discussionId }, "replyCount", incReplyCount);
  }

  async addReply(
    currentUser: UserEntity,
    discussion: DiscussionEntity,
    content: string
  ): Promise<DiscussionReplyEntity> {
    return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const discussionReply = new DiscussionReplyEntity();
      discussionReply.content = content;
      discussionReply.publishTime = new Date();
      discussionReply.isPublic = this.configService.config.preference.security.discussionReplyDefaultPublic;
      discussionReply.discussionId = discussion.id;
      discussionReply.publisherId = currentUser.id;
      await transactionalEntityManager.save(discussionReply);

      await this.updateSortTime(discussion.id, transactionalEntityManager);
      await this.updateReplyCount(discussion.id, 1, transactionalEntityManager);

      return discussionReply;
    });
  }

  async updateReplyContent(discussionReply: DiscussionReplyEntity, newContent: string): Promise<void> {
    discussionReply.content = newContent;
    discussionReply.editTime = new Date();
    await this.discussionReplyRepository.save(discussionReply);
  }

  async setReplyPublic(discussionReply: DiscussionReplyEntity, isPublic: boolean): Promise<void> {
    discussionReply.isPublic = isPublic;
    await this.discussionReplyRepository.save(discussionReply);
  }

  async deleteReply(discussionReply: DiscussionReplyEntity): Promise<void> {
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      await transactionalEntityManager.delete(DiscussionReplyEntity, discussionReply.id);
      await this.updateSortTime(discussionReply.discussionId, transactionalEntityManager);
      await this.updateReplyCount(discussionReply.discussionId, -1, transactionalEntityManager);
    });
  }

  async getReactions(type: DiscussionReactionType, id: number, currentUser: UserEntity): Promise<GetReactionsResult>;

  async getReactions(
    type: DiscussionReactionType,
    ids: number[],
    currentUser: UserEntity
  ): Promise<GetReactionsResult[]>;

  async getReactions(
    type: DiscussionReactionType,
    ids: number | number[],
    currentUser: UserEntity
  ): Promise<GetReactionsResult | GetReactionsResult[]> {
    let returnOne = false;
    if (typeof ids === "number") {
      ids = [ids];
      returnOne = true;
    }

    if (ids.length === 0) return [];

    const idColumnName = type === DiscussionReactionType.Discussion ? "discussionId" : "discussionReplyId";
    const [reactionsById, currentUserReactionsById] = await Promise.all([
      (async () => {
        const reactionsAll: { id: number; emoji: Buffer; count: number }[] = await this.connection
          .createQueryBuilder()
          .select("emoji")
          .addSelect(idColumnName, "id")
          .addSelect("COUNT(*)", "count")
          .from(
            type === DiscussionReactionType.Discussion ? DiscussionReactionEntity : DiscussionReplyReactionEntity,
            "reaction"
          )
          .where(`${idColumnName} IN (:...ids)`, { ids })
          .groupBy(idColumnName)
          .addGroupBy("emoji")
          .getRawMany();
        const byId: Record<number, Record<string, number>> = Object.fromEntries(ids.map(id => [id, {}]));
        for (const { id, emoji, count } of reactionsAll) byId[id][emoji.toString("utf-8")] = count;
        return byId;
      })(),
      (async () => {
        if (!currentUser) return {};
        const currentUserReactionsAll: { id: number; emoji: Buffer }[] = await this.connection
          .createQueryBuilder()
          .select("emoji")
          .addSelect(idColumnName, "id")
          .from(
            type === DiscussionReactionType.Discussion ? DiscussionReactionEntity : DiscussionReplyReactionEntity,
            "reaction"
          )
          .where(`${idColumnName} IN (:...ids)`, { ids })
          .andWhere("userId = :userId", { userId: currentUser.id })
          .getRawMany();
        const byId: Record<number, string[]> = Object.fromEntries(ids.map(id => [id, []]));
        for (const { id, emoji } of currentUserReactionsAll) byId[id].push(emoji.toString("utf-8"));
        return byId;
      })()
    ]);

    const result = ids.map<GetReactionsResult>(id => [reactionsById[id], currentUserReactionsById[id] || []]);
    return returnOne ? result[0] : result;
  }

  async addReaction(type: DiscussionReactionType, id: number, currentUser: UserEntity, emoji: string): Promise<void> {
    await (type === DiscussionReactionType.Discussion
      ? this.discussionReactionRepository
      : this.discussionReplyReactionRepository
    )
      .createQueryBuilder()
      .insert()
      .values({
        [type === DiscussionReactionType.Discussion ? "discussionId" : "discussionReplyId"]: id,
        userId: currentUser.id,
        emoji: Buffer.from(emoji)
      })
      .orIgnore()
      .execute();
  }

  async removeReaction(
    type: DiscussionReactionType,
    id: number,
    currentUser: UserEntity,
    emoji: string
  ): Promise<void> {
    await (type === DiscussionReactionType.Discussion
      ? this.discussionReactionRepository
      : this.discussionReplyReactionRepository
    ).delete({
      [type === DiscussionReactionType.Discussion ? "discussionId" : "discussionReplyId"]: id,
      userId: currentUser.id,
      emoji: Buffer.from(emoji)
    });
  }

  async deleteDiscussion(discussion: DiscussionEntity): Promise<void> {
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      // delete permissions
      await this.permissionService.replaceUsersAndGroupsPermissionForObject(
        discussion.id,
        PermissionObjectType.Discussion,
        [],
        [],
        transactionalEntityManager
      );

      // delete everything
      await transactionalEntityManager.remove(discussion);
    });
  }

  async getDiscussionCountOfProblem(problem: ProblemEntity): Promise<number> {
    return await this.discussionRepository.count({ problemId: problem.id });
  }
}
