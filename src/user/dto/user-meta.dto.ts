import { ApiModelProperty } from "@nestjs/swagger";

export class UserMetaDto {
  @ApiModelProperty()
  readonly id: number;

  @ApiModelProperty()
  readonly username: string;

  @ApiModelProperty()
  readonly email: string;

  @ApiModelProperty()
  readonly bio: string;
}
