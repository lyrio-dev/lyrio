import { ApiProperty } from "@nestjs/swagger";
import { UserPrivilegeType } from "@/user/user-privilege.service";
import { UserMetaDto, UserPreferenceDto } from "@/user/dto";
import { PreferenceConfig } from "@/config/config.schema";

export class GetSessionInfoResponseDto {
  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty()
  joinedGroupsCount?: number;

  @ApiProperty({ enum: UserPrivilegeType, isArray: true })
  userPrivileges?: UserPrivilegeType[];

  @ApiProperty()
  userPreference?: UserPreferenceDto;

  @ApiProperty()
  serverPreference?: PreferenceConfig;
}
