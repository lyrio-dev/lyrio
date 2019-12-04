import { ApiModelProperty } from "@nestjs/swagger";
import { IsInt, IsBoolean } from "class-validator";

export class DeleteGroupRequestDto {
  @ApiModelProperty()
  @IsInt()
  readonly groupId: number;

  @ApiModelProperty()
  @IsBoolean()
  readonly force: boolean;
}
