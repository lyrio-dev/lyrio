import { ApiProperty } from "@nestjs/swagger";
import { Length } from "class-validator";
import { IsUsername } from "@/common/validators";

export class LoginRequestDto {
  @ApiProperty()
  @IsUsername()
  readonly username: string;

  @ApiProperty()
  @Length(6, 32)
  readonly password: string;
}
