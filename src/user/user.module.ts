import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { UserEntity } from "./user.entity";
import { UserPrivilegeEntity } from "./user-privilege.entity";
import { UserService } from "./user.service";
import { UserPrivilegeService } from "./user-privilege.service";
import { UserController } from "./user.controller";
import { AuthModule } from "@/auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    TypeOrmModule.forFeature([UserPrivilegeEntity]),
    forwardRef(() => ConfigModule),
    forwardRef(() => AuthModule)
  ],
  providers: [UserService, UserPrivilegeService],
  controllers: [UserController],
  exports: [UserService, UserPrivilegeService]
})
export class UserModule {}
