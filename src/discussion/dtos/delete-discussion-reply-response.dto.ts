import { ApiProperty } from "@nestjs/swagger";

export enum DeleteDiscussionReplyResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION_REPLY = "NO_SUCH_DISCUSSION_REPLY"
}

export class DeleteDiscussionReplyResponseDto {
  @ApiProperty()
  error?: DeleteDiscussionReplyResponseError;
}
