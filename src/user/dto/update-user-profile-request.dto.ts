import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsEmail, Length, IsString, IsOptional, IsBoolean, ValidateNested, MaxLength } from "class-validator";
import { Type } from "class-transformer";

import { IsUsername } from "@/common/validators";

import { UserInformationDto } from "./user-information.dto";

export class UpdateUserProfileRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;

  @ApiProperty()
  @IsUsername()
  @IsOptional()
  readonly username?: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @ApiProperty()
  @IsBoolean()
  readonly publicEmail: boolean;

  @ApiProperty()
  @MaxLength(50)
  readonly avatarInfo: string;

  @ApiProperty()
  @IsString()
  @Length(0, 24)
  readonly nickname: string;

  @ApiProperty()
  @IsString()
  @Length(0, 160)
  readonly bio: string;

  @ApiProperty()
  @Type(() => UserInformationDto)
  @ValidateNested()
  readonly information: UserInformationDto;
}
