import { ApiProperty } from "@nestjs/swagger";

import { UserAvatarDto } from "./user-avatar.dto";

export class UserMetaDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  bio: string;

  @ApiProperty()
  avatar: UserAvatarDto;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty()
  acceptedProblemCount: number;

  @ApiProperty()
  submissionCount: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  registrationTime: Date;
}
