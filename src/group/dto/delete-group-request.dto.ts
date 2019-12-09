import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsBoolean } from "class-validator";

export class DeleteGroupRequestDto {
  @ApiProperty()
  @IsInt()
  readonly groupId: number;

  @ApiProperty()
  @IsBoolean()
  readonly force: boolean;
}
