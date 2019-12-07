import { ApiModelProperty } from "@nestjs/swagger";
import { Locale } from "@/common/locale.type";

import { ProblemType } from "../problem.entity";

export class ProblemMetaDto {
  @ApiModelProperty()
  id: number;

  @ApiModelProperty()
  displayId?: number;

  @ApiModelProperty()
  type: ProblemType;

  @ApiModelProperty()
  isPublic: boolean;

  @ApiModelProperty()
  ownerId: number;

  @ApiModelProperty()
  locales: Locale[];
}
