import { ApiProperty } from "@nestjs/swagger";

export enum AddUserToGroupResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  USER_ALREADY_IN_GROUP = "USER_ALREADY_IN_GROUP"
}

export class AddUserToGroupResponseDto {
  @ApiProperty({ enum: AddUserToGroupResponseError })
  error?: AddUserToGroupResponseError;
}
