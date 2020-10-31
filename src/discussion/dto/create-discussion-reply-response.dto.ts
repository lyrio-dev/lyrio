import { ApiProperty } from "@nestjs/swagger";

import { DiscussionReplyDto } from "./get-discussion-and-replies-response.dto";

export enum CreateDiscussionReplyResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION"
}

export class CreateDiscussionReplyResponseDto {
  @ApiProperty()
  error?: CreateDiscussionReplyResponseError;

  @ApiProperty()
  reply?: DiscussionReplyDto;
}
