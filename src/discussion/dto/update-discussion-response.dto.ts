import { ApiProperty } from "@nestjs/swagger";

export enum UpdateDiscussionResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION"
}

export class UpdateDiscussionResponseDto {
  @ApiProperty()
  error?: UpdateDiscussionResponseError;
}
