import { ApiProperty } from "@nestjs/swagger";

export enum UpdateDiscussionReplyResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION_REPLY = "NO_SUCH_DISCUSSION_REPLY"
}

export class UpdateDiscussionReplyResponseDto {
  @ApiProperty()
  error?: UpdateDiscussionReplyResponseError;

  @ApiProperty()
  editTime?: Date;
}
