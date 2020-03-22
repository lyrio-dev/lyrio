import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "@/user/dto/user-meta.dto";
import { UserPreferenceDto } from "@/user/dto";
import { PreferenceConfig } from "@/config/config.schema";
import { UserPrivilegeType } from "@/user/user-privilege.entity";

export class GetCurrentUserAndPreferenceResponseDto {
  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty({ enum: UserPrivilegeType, isArray: true })
  userPrivileges?: UserPrivilegeType[];

  @ApiProperty()
  userPreference?: UserPreferenceDto;

  @ApiProperty()
  serverPreference?: PreferenceConfig;
}
