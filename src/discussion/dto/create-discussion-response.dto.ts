import { ApiProperty } from "@nestjs/swagger";

export enum CreateDiscussionResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM"
}

export class CreateDiscussionResponseDto {
  @ApiProperty()
  error?: CreateDiscussionResponseError;

  @ApiProperty()
  discussionId?: number;
}
