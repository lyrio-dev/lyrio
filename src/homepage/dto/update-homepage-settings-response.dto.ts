import { ApiProperty } from "@nestjs/swagger";

export enum UpdateHomepageSettingsResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION"
}

export class UpdateHomepageSettingsResponseDto {
  @ApiProperty()
  error?: UpdateHomepageSettingsResponseError;

  @ApiProperty()
  errorDiscussionId?: number;
}
