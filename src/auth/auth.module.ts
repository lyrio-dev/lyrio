import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RecaptchaModule } from "@/app.module";
import { ConfigModule } from "@/config/config.module";
import { UserModule } from "@/user/user.module";
import { GroupModule } from "@/group/group.module";
import { RedisModule } from "@/redis/redis.module";
import { MailModule } from "@/mail/mail.module";
import { AuditModule } from "@/audit/audit.module";
import { MigrationModule } from "@/migration/migration.module";

import { UserAuthEntity } from "./user-auth.entity";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthEmailVerifactionCodeService } from "./auth-email-verifaction-code.service";
import { AuthSessionService } from "./auth-session.service";
import { AuthIpLocationService } from "./auth-ip-location.service";

@Module({
  imports: [
    forwardRef(() => RecaptchaModule),
    TypeOrmModule.forFeature([UserAuthEntity]),
    forwardRef(() => ConfigModule),
    forwardRef(() => UserModule),
    forwardRef(() => GroupModule),
    forwardRef(() => RedisModule),
    forwardRef(() => MailModule),
    forwardRef(() => AuditModule),
    forwardRef(() => MigrationModule)
  ],
  providers: [AuthService, AuthEmailVerifactionCodeService, AuthSessionService, AuthIpLocationService],
  controllers: [AuthController],
  exports: [AuthService, AuthEmailVerifactionCodeService, AuthSessionService, AuthIpLocationService]
})
export class AuthModule {}
