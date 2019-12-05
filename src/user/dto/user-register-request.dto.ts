import { ApiModelProperty } from "@nestjs/swagger";
import { IsEmail, Length } from "class-validator";
import { IsUsername } from "@/common/validators";

export class UserRegisterRequestDto {
  @ApiModelProperty()
  @IsUsername()
  readonly username: string;

  @ApiModelProperty()
  @IsEmail()
  readonly email: string;

  @ApiModelProperty()
  @Length(6, 32)
  readonly password: string;
}
