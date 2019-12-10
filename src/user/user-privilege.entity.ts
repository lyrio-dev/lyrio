import {
  Entity,
  PrimaryColumn,
  Index,
  ManyToOne,
  JoinColumn
} from "typeorm";

import { UserEntity } from "@/user/user.entity";

export enum UserPrivilegeType {
  MANAGE_USER = "MANAGE_USER",
  MANAGE_USER_GROUP = "MANAGE_USER_GROUP",
  MANAGE_PROBLEM = "MANAGE_PROBLEM",
  MANAGE_CONTEST = "MANAGE_CONTEST",
  MANAGE_DISCUSSION = "MANAGE_DISCUSSION"
}

@Entity("user_privilege")
export class UserPrivilegeEntity {
  @ManyToOne(type => UserEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  user: Promise<UserEntity>;

  @PrimaryColumn()
  @Index()
  userId: number;

  @PrimaryColumn({
    type: "enum",
    enum: UserPrivilegeType
  })
  @Index()
  privilegeType: UserPrivilegeType;
}
