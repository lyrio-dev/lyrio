import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "@/user/dto/user-meta.dto";
import { UserPreferenceDto } from "@/user/dto";
import { PreferenceConfig } from "@/config/config.schema";

export class GetCurrentUserAndPreferenceResponseDto {
  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty()
  userPreference?: UserPreferenceDto;

  @ApiProperty()
  serverPreference?: PreferenceConfig;
}
