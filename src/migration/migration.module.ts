import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "@/auth/auth.module";
import { UserModule } from "@/user/user.module";
import { AuditModule } from "@/audit/audit.module";

import { MigrationController } from "./migration.controller";
import { MigrationService } from "./migration.service";
import { UserMigrationInfoEntity } from "./user-migration-info.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMigrationInfoEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuditModule)
  ],
  providers: [MigrationService],
  controllers: [MigrationController],
  exports: [MigrationService]
})
export class MigrationModule {}
