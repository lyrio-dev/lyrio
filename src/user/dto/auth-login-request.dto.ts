import { ApiModelProperty } from "@nestjs/swagger";
import { Length } from "class-validator";
import { IsUsername } from "@/common/validators";

export class AuthLoginRequestDto {
  @ApiModelProperty()
  @IsUsername()
  readonly username: string;

  @ApiModelProperty()
  @Length(6, 32)
  readonly password: string;
}
