import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsEmail, Length, IsString } from "class-validator";
import { IsUsername } from "@/common/validators";

export class UserUpdateUserProfileRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;

  @ApiProperty()
  @IsUsername()
  readonly username?: string;

  @ApiProperty()
  @IsEmail()
  readonly email?: string;

  @ApiProperty()
  @IsString()
  @Length(0, 1024)
  readonly bio?: string;

  @ApiProperty()
  @Length(6, 32)
  @IsString()
  readonly oldPassword?: string;

  @ApiProperty()
  @Length(6, 32)
  @IsString()
  readonly password?: string;
}
