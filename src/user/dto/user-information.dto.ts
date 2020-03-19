import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, IsUrl } from "class-validator";

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
