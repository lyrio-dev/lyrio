import {
  Entity,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  Column,
  JoinColumn
} from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { GroupEntity } from "./group.entity";

@Entity("group-membership")
@Index(["userId", "groupId"], { unique: true })
@Index(["groupId", "isAdmin"], { unique: true })
export class GroupMembershipEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => UserEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  user: Promise<UserEntity>;

  @Column()
  @Index()
  userId: number;

  @ManyToOne(type => GroupEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  group: Promise<GroupEntity>;

  @Column()
  @Index()
  groupId: number;

  @Column({ type: "boolean" })
  isAdmin: boolean;
}
