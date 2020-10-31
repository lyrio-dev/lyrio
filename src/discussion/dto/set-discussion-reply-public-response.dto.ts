import { ApiProperty } from "@nestjs/swagger";

export enum SetDiscussionReplyPublicResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION_REPLY = "NO_SUCH_DISCUSSION_REPLY"
}

export class SetDiscussionReplyPublicResponseDto {
  @ApiProperty()
  error?: SetDiscussionReplyPublicResponseError;
}
