import { Entity, PrimaryColumn, Index, ManyToOne } from "typeorm";

import { PermissionObjectType } from "./permission-object-type.enum";
import { PermissionType } from "./permission-type.enum";
import { GroupEntity } from "@/group/group.entity";

@Entity("permission_for_group")
@Index(["objectId", "objectType", "groupId"])
export class PermissionForGroupEntity {
  @PrimaryColumn({ type: "integer" })
  objectId: number;

  @PrimaryColumn({ type: "enum", enum: PermissionObjectType })
  objectType: PermissionObjectType;

  @PrimaryColumn()
  @Index()
  groupId: number;

  @ManyToOne(type => GroupEntity, { onDelete: "CASCADE" })
  group: GroupEntity;

  @PrimaryColumn({ type: "enum", enum: PermissionType })
  permissionType: PermissionType;
}
