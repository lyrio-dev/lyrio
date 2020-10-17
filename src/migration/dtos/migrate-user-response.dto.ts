import { ApiProperty } from "@nestjs/swagger";

export enum MigrateUserResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  NO_SUCH_USER = "NO_SUCH_USER",
  WRONG_PASSWORD = "WRONG_PASSWORD",
  ALREADY_MIGRATED = "ALREADY_MIGRATED",
  DUPLICATE_USERNAME = "DUPLICATE_USERNAME"
}

export class MigrateUserResponseDto {
  @ApiProperty()
  error?: MigrateUserResponseError;

  @ApiProperty()
  token?: string;
}
