import { ApiProperty } from "@nestjs/swagger";

import { IsString, Length, MaxLength } from "class-validator";

export class LoginRequestDto {
  @ApiProperty({
    description: "A SYZOJ 2 username is allowed to check if a user is not migrated."
  })
  @IsString()
  @MaxLength(80)
  readonly username: string;

  @ApiProperty()
  @Length(6, 32)
  readonly password: string;
}
