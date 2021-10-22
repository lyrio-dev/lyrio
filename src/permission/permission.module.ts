import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserModule } from "@/user/user.module";
import { GroupModule } from "@/group/group.module";

import { PermissionService } from "./permission.service";
import { PermissionForUserEntity } from "./permission-for-user.entity";
import { PermissionForGroupEntity } from "./permission-for-group.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionForUserEntity]),
    TypeOrmModule.forFeature([PermissionForGroupEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => GroupModule)
  ],
  providers: [PermissionService],
  exports: [PermissionService]
})
export class PermissionModule {}
