import { ApiProperty } from "@nestjs/swagger";

export enum DeleteDiscussionResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION"
}

export class DeleteDiscussionResponseDto {
  @ApiProperty()
  error?: DeleteDiscussionResponseError;
}
