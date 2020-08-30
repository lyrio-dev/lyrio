import { Entity, PrimaryColumn, Index, ManyToOne, Column } from "typeorm";

import { UserEntity } from "@/user/user.entity";

import { PermissionObjectType } from "./permission-object-type.enum";

@Entity("permission_for_user")
@Index(["objectId", "objectType", "userId"])
export class PermissionForUserEntity {
  @PrimaryColumn({ type: "integer" })
  objectId: number;

  @PrimaryColumn({ type: "enum", enum: PermissionObjectType })
  objectType: PermissionObjectType;

  @PrimaryColumn()
  @Index()
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  user: UserEntity;

  // A number, larger means higher permission e.g. 1 for RO and 2 for RW
  @Column({ type: "integer" })
  permissionLevel: number;
}
