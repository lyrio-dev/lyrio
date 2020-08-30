import { ApiProperty } from "@nestjs/swagger";

import { IsIntString } from "@/common/validators";

export class GetGroupMetaRequestDto {
  @ApiProperty()
  // It should be IsInt but the GET request's input data passed with querystring loses its type.
  @IsIntString()
  readonly groupId: string;
}
