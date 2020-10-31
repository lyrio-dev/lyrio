import { ApiProperty } from "@nestjs/swagger";

export enum QueryUserMigrationInfoResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  NO_SUCH_USER = "NO_SUCH_USER"
}

export class QueryUserMigrationInfoResponseDto {
  @ApiProperty()
  error?: QueryUserMigrationInfoResponseError;

  @ApiProperty()
  migrated?: boolean;

  @ApiProperty()
  usernameMustChange?: boolean;
}
