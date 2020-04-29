import { ApiProperty } from "@nestjs/swagger";

export enum DeleteGroupResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_GROUP = "NO_SUCH_GROUP"
}

export class DeleteGroupResponseDto {
  @ApiProperty({ enum: DeleteGroupResponseError })
  error?: DeleteGroupResponseError;
}
