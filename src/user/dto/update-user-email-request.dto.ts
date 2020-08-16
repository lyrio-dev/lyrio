import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsEmail, IsString, IsOptional } from "class-validator";

export class UpdateUserEmailRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;

  @ApiProperty()
  @IsEmail()
  readonly email: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  readonly emailVerificationCode?: string;
}
