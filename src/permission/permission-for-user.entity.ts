import { Entity, PrimaryColumn, Index, ManyToOne } from "typeorm";

import { PermissionObjectType } from "./permission-object-type.enum";
import { PermissionType } from "./permission-type.enum";
import { UserEntity } from "@/user/user.entity";

@Entity("permission_for_user")
@Index(["objectId", "objectType", "userId", "permissionType"])
export class PermissionForUserEntity {
  @PrimaryColumn({ type: "integer" })
  objectId: number;

  @PrimaryColumn({ type: "enum", enum: PermissionObjectType })
  objectType: PermissionObjectType;

  @PrimaryColumn()
  @Index()
  userId: number;

  @ManyToOne(type => UserEntity, { onDelete: "CASCADE" })
  user: UserEntity;

  @PrimaryColumn({ type: "enum", enum: PermissionType })
  permissionType: PermissionType;
}
