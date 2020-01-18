import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { GroupService } from "./group.service";
import { GroupController } from "./group.controller";
import { GroupEntity } from "./group.entity";
import { GroupMembershipEntity } from "./group-membership.entity";
import { UserModule } from "@/user/user.module";

@Module({
  imports: [TypeOrmModule.forFeature([GroupEntity]), TypeOrmModule.forFeature([GroupMembershipEntity]), UserModule],
  providers: [GroupService],
  controllers: [GroupController],
  exports: [GroupService]
})
export class GroupModule {}
