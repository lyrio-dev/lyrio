import { ApiProperty } from "@nestjs/swagger";

import { IsGroupName } from "@/common/validators";

export class CreateGroupRequestDto {
  @ApiProperty()
  @IsGroupName()
  readonly groupName: string;
}
