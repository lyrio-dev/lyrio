import {
  Entity,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  Column,
  JoinColumn
} from "typeorm";

import { UserEntity } from "@/user/user.entity";

export enum UserPrivilegeType {
  MANAGE_USER = "MANAGE_USER",
  MANAGE_PROBLEM = "MANAGE_PROBLEM",
  MANAGE_CONTEST = "MANAGE_CONTEST",
  MANAGE_DISCUSSION = "MANAGE_DISCUSSION"
}

@Entity("user-privilege")
@Index(["userId", "privilegeType"], { unique: true })
export class UserPrivilegeEntity {
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

  @Column({
    type: "enum",
    enum: UserPrivilegeType
  })
  @Index()
  privilegeType: UserPrivilegeType;
}
