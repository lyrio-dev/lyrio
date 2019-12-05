import { ApiModelProperty } from "@nestjs/swagger";
import { IsNumber, IsBoolean } from "class-validator";

export class SetGroupAdminRequestDto {
  @ApiModelProperty()
  @IsNumber()
  readonly userId: number;

  @ApiModelProperty()
  @IsNumber()
  readonly groupId: number;

  @ApiModelProperty()
  @IsBoolean()
  readonly isGroupAdmin: boolean;
}
