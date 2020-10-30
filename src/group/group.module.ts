import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserModule } from "@/user/user.module";
import { AuditModule } from "@/audit/audit.module";

import { GroupService } from "./group.service";
import { GroupController } from "./group.controller";
import { GroupEntity } from "./group.entity";
import { GroupMembershipEntity } from "./group-membership.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupEntity]),
    TypeOrmModule.forFeature([GroupMembershipEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => AuditModule)
  ],
  providers: [GroupService],
  controllers: [GroupController],
  exports: [GroupService]
})
export class GroupModule {}
