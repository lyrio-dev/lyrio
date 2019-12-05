import { createParamDecorator } from "@nestjs/common";
import { UserEntity } from "@/user/user.entity";

export const CurrentUser = createParamDecorator(
  (data: string, req): UserEntity => {
    return data ? req.user && req.user[data] : req.user;
  }
);
