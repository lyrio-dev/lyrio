import { ApiModelProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class AddUserToGroupRequestDto {
  @ApiModelProperty()
  @IsInt()
  readonly userId: number;

  @ApiModelProperty()
  @IsInt()
  readonly groupId: number;
}
