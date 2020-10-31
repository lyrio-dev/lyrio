import { ApiProperty } from "@nestjs/swagger";

export enum SetDiscussionPublicResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION"
}

export class SetDiscussionPublicResponseDto {
  @ApiProperty()
  error?: SetDiscussionPublicResponseError;
}
