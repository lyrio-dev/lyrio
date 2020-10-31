import { ApiProperty } from "@nestjs/swagger";

export enum ToggleReactionResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION",
  NO_SUCH_DISCUSSION_REPLY = "NO_SUCH_DISCUSSION_REPLY",
  INVALID_EMOJI = "INVALID_EMOJI"
}

export class ToggleReactionResponseDto {
  @ApiProperty()
  error?: ToggleReactionResponseError;
}
