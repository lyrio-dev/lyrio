import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserEntity } from "./user.entity";
import { UserAuthEntity } from "./user-auth.entity";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { ConfigModule } from "src/config/config.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    TypeOrmModule.forFeature([UserAuthEntity]),
    ConfigModule
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService]
})
export class UserModule {}
