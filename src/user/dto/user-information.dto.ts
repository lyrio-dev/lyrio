import { ApiProperty } from "@nestjs/swagger";

import { IsString, MaxLength, IsUrl, ValidateIf } from "class-validator";

export class UserInformationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  organization: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  location: string;

  @ApiProperty()
  @IsUrl()
  @IsString()
  @MaxLength(80)
  @ValidateIf(({ url }) => url !== "")
  url: string;

  @ApiProperty()
  @IsString()
  @MaxLength(30)
  telegram: string;

  @ApiProperty()
  @IsString()
  @MaxLength(30)
  qq: string;

  @ApiProperty()
  @IsString()
  @MaxLength(30)
  github: string;
}
