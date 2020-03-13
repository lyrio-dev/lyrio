import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsEmail, Length, IsString, IsOptional, IsBoolean } from "class-validator";
import { IsUsername } from "@/common/validators";

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
  @IsString()
  @Length(0, 160)
  readonly bio: string;

  // null means change the value to null, meaning "unknown" or "other", not meaning not changing
  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  sexIsFamale: boolean;

  @ApiProperty()
  @IsString()
  @Length(0, 80)
  organization: string;

  @ApiProperty()
  @IsString()
  @Length(0, 80)
  location: string;

  @ApiProperty()
  @Length(6, 32)
  @IsString()
  @IsOptional()
  readonly oldPassword?: string;

  @ApiProperty()
  @Length(6, 32)
  @IsString()
  @IsOptional()
  readonly password?: string;
}
