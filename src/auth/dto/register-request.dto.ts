import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, Length } from "class-validator";
import { IsUsername } from "@/common/validators";

export class RegisterRequestDto {
  @ApiProperty()
  @IsUsername()
  readonly username: string;

  @ApiProperty()
  @IsEmail()
  readonly email: string;

  @ApiProperty()
  @Length(6, 32)
  readonly password: string;
}
