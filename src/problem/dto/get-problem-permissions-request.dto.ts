import { ApiProperty } from "@nestjs/swagger";
import { IsIntString } from "@/common/validators";

export class GetProblemPermissionsRequestDto {
  @ApiProperty()
  @IsIntString()
  readonly problemId: string;
}
