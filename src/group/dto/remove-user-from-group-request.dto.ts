import { ApiModelProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class RemoveUserFromGroupRequestDto {
  @ApiModelProperty()
  @IsInt()
  readonly userId: number;

  @ApiModelProperty()
  @IsInt()
  readonly groupId: number;
}
