import { ApiProperty } from "@nestjs/swagger";
import { Length } from "class-validator";
import { IsUsername } from "@/common/validators";

export class AuthLoginRequestDto {
  @ApiProperty()
  @IsUsername()
  readonly username: string;

  @ApiProperty()
  @Length(6, 32)
  readonly password: string;
}
