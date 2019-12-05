import { ApiModelProperty } from "@nestjs/swagger";
import { IsNumberString, IsOptional, IsBooleanString } from "class-validator";
import { IsUsername } from "@/common/validators";

export class UserGetUserMetaRequestDto {
  @ApiModelProperty({
    required: false
  })
  // FIXME: It should be IsInt but the GET request's input data passed with querystring loses its type.
  @IsNumberString()
  @IsOptional()
  readonly userId?: string;

  @ApiModelProperty({
    required: false
  })
  @IsUsername()
  @IsOptional()
  readonly username?: string;

  @ApiModelProperty()
  @IsBooleanString()
  @IsOptional()
  readonly getPrivileges?: boolean;
}
