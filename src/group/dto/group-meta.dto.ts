import { ApiModelProperty } from "@nestjs/swagger";

export class GroupMetaDto {
  @ApiModelProperty()
  readonly id: number;

  @ApiModelProperty()
  readonly name: string;

  @ApiModelProperty()
  readonly ownerId: number;
}
