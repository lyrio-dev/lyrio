import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserEntity } from "./user.entity";
import { UserAuthEntity } from "./user-auth.entity";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { AuthController } from "./auth.controller";
import { ConfigModule } from "../config/config.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    TypeOrmModule.forFeature([UserAuthEntity]),
    ConfigModule
  ],
  providers: [AuthService, UserService],
  controllers: [AuthController],
  exports: [AuthService, UserService]
})
export class UserModule {}
