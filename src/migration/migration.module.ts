import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "@/auth/auth.module";
import { UserModule } from "@/user/user.module";
import { AuditModule } from "@/audit/audit.module";
import { RedisModule } from "@/redis/redis.module";

import { MigrationController } from "./migration.controller";
import { UserMigrationService } from "./user-migration.service";
import { UserMigrationInfoEntity } from "./user-migration-info.entity";
import { MigrationService } from "./migration.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMigrationInfoEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuditModule),
    forwardRef(() => RedisModule)
  ],
  providers: [UserMigrationService, MigrationService],
  controllers: [MigrationController],
  exports: [UserMigrationService]
})
export class MigrationModule {}
