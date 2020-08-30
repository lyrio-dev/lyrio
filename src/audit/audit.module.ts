import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";

import { AuditLogEntity } from "./audit-log.entity";
import { AuditService } from "./audit.service";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity]), forwardRef(() => ConfigModule)],
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}
