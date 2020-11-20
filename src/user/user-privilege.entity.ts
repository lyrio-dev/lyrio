import { Entity, PrimaryColumn, Index, ManyToOne, JoinColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

export enum UserPrivilegeType {
  // Management privileges
  EditHomepage = "EditHomepage",
  ManageUser = "ManageUser",
  ManageUserGroup = "ManageUserGroup",
  ManageProblem = "ManageProblem",
  ManageContest = "ManageContest",
  ManageDiscussion = "ManageDiscussion",

  // Other privileges
  SkipRecaptcha = "SkipRecaptcha"
}

@Entity("user_privilege")
export class UserPrivilegeEntity {
  @ManyToOne(() => UserEntity, {
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
