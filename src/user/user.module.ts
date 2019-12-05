import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { UserEntity } from "./user.entity";
import { UserAuthEntity } from "./user-auth.entity";
import { UserPrivilegeEntity } from "./user-privilege.entity";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { UserPrivilegeService } from "./user-privilege.service";
import { AuthController } from "./auth.controller";
import { UserController } from "./user.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    TypeOrmModule.forFeature([UserAuthEntity]),
    TypeOrmModule.forFeature([UserPrivilegeEntity]),
    ConfigModule
  ],
  providers: [AuthService, UserService, UserPrivilegeService],
  controllers: [AuthController, UserController],
  exports: [AuthService, UserService, UserPrivilegeService]
})
export class UserModule {}
