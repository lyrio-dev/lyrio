import { ApiProperty } from "@nestjs/swagger";

export enum UserAvatarType {
  Gravatar = "gravatar",
  GitHub = "github",
  QQ = "qq"
}

export class UserAvatarDto {
  @ApiProperty()
  type: UserAvatarType;

  @ApiProperty()
  key: string;
}
