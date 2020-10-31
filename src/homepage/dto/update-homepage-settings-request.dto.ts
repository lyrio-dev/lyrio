import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import { HomepageSettings } from "../homepage-settings.interface";

export class UpdateHomepageSettingsRequestDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => HomepageSettings)
  settings: HomepageSettings;
}
