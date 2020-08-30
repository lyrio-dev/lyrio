import { Entity, PrimaryGeneratedColumn, Index, ManyToOne, Column, JoinColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

import { GroupEntity } from "./group.entity";

@Entity("group_membership")
@Index(["userId", "groupId"], { unique: true })
@Index(["groupId", "isGroupAdmin"])
export class GroupMembershipEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  user: Promise<UserEntity>;

  @Column()
  @Index()
  userId: number;

  @ManyToOne(() => GroupEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  group: Promise<GroupEntity>;

  @Column()
  @Index()
  groupId: number;

  @Column({ type: "boolean" })
  isGroupAdmin: boolean;
}
