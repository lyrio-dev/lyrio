import { ApiProperty } from "@nestjs/swagger";

export enum RenameGroupResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  DUPLICATE_GROUP_NAME = "DUPLICATE_GROUP_NAME"
}

export class RenameGroupResponseDto {
  @ApiProperty({ enum: RenameGroupResponseError })
  error?: RenameGroupResponseError;
}
