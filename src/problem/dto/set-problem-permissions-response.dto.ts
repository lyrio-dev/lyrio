import { ApiProperty } from "@nestjs/swagger";

export enum SetProblemPermissionsResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP"
}

export class SetProblemPermissionsResponseDto {
  @ApiProperty({ enum: SetProblemPermissionsResponseError })
  error?: SetProblemPermissionsResponseError;

  @ApiProperty()
  errorObjectId?: number;
}
