import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, IsBoolean, IsOptional, IsUrl } from "class-validator";

export class UserInformationDto {
  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  // `null` in a request means change the value to null, meaning "unknown" or "other", not means "not changing"
  sexIsFamale: boolean;

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
