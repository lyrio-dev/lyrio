import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

import { IsGroupName } from "@/common/validators";

export class RenameGroupRequestDto {
  @ApiProperty()
  @IsInt()
  readonly groupId: number;

  @ApiProperty()
  @IsGroupName()
  readonly name: string;
}
