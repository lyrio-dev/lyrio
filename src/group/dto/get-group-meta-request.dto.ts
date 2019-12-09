import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString } from "class-validator";

export class GetGroupMetaRequestDto {
  @ApiProperty()
  // It should be IsInt but the GET request's input data passed with querystring loses its type.
  @IsNumberString()
  readonly groupId: string;
}
