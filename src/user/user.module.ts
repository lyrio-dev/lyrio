import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { AuthModule } from "@/auth/auth.module";
import { SubmissionModule } from "@/submission/submission.module";
import { RedisModule } from "@/redis/redis.module";
import { AuditModule } from "@/audit/audit.module";

import { UserEntity } from "./user.entity";
import { UserPrivilegeEntity } from "./user-privilege.entity";
import { UserInformationEntity } from "./user-information.entity";
import { UserPreferenceEntity } from "./user-preference.entity";
import { UserService } from "./user.service";
import { UserPrivilegeService } from "./user-privilege.service";
import { UserController } from "./user.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    TypeOrmModule.forFeature([UserPrivilegeEntity]),
    TypeOrmModule.forFeature([UserInformationEntity]),
    TypeOrmModule.forFeature([UserPreferenceEntity]),
    forwardRef(() => ConfigModule),
    forwardRef(() => AuthModule),
    forwardRef(() => SubmissionModule),
    forwardRef(() => RedisModule),
    forwardRef(() => AuditModule)
  ],
  providers: [UserService, UserPrivilegeService],
  controllers: [UserController],
  exports: [UserService, UserPrivilegeService]
})
export class UserModule {}
