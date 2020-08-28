import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { UserAuthEntity } from "./user-auth.entity";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "@/user/user.module";
import { GroupModule } from "@/group/group.module";
import { RedisModule } from "@/redis/redis.module";
import { AuthEmailVerifactionCodeService } from "./auth-email-verifaction-code.service";
import { AuthSessionService } from "./auth-session.service";
import { AuthIpLocationService } from "./auth-ip-location.service";
import { MailModule } from "@/mail/mail.module";
import { AuditModule } from "@/audit/audit.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAuthEntity]),
    forwardRef(() => ConfigModule),
    forwardRef(() => UserModule),
    forwardRef(() => GroupModule),
    forwardRef(() => RedisModule),
    forwardRef(() => MailModule),
    forwardRef(() => AuditModule)
  ],
  providers: [AuthService, AuthEmailVerifactionCodeService, AuthSessionService, AuthIpLocationService],
  controllers: [AuthController],
  exports: [AuthService, AuthSessionService, AuthEmailVerifactionCodeService]
})
export class AuthModule {}
