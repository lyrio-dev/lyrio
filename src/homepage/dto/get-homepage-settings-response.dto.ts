import { ApiProperty } from "@nestjs/swagger";

import { DiscussionMetaDto } from "@/discussion/dto";

import { HomepageSettings } from "../homepage-settings.interface";

export enum GetHomepageSettingsResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetHomepageSettingsResponseDto {
  @ApiProperty()
  error?: GetHomepageSettingsResponseError;

  @ApiProperty()
  settings?: HomepageSettings;

  @ApiProperty({ type: [DiscussionMetaDto] })
  annnouncementDiscussions?: DiscussionMetaDto[];
}
