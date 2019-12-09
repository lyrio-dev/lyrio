import { ApiProperty } from "@nestjs/swagger";

export class UserMetaDto {
  @ApiProperty()
  readonly id: number;

  @ApiProperty()
  readonly username: string;

  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly bio: string;

  @ApiProperty()
  readonly isAdmin: boolean;
}
