import { ApiProperty } from "@nestjs/swagger";

export enum DeleteContestResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST"
}

export class DeleteContestResponseDto {
  @ApiProperty()
  error?: DeleteContestResponseError;
}
