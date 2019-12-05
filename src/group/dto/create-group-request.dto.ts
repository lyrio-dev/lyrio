import { ApiModelProperty } from "@nestjs/swagger";
import { IsGroupName } from "@/common/validators";

export class CreateGroupRequestDto {
  @ApiModelProperty()
  @IsGroupName()
  readonly groupName: string;
}
