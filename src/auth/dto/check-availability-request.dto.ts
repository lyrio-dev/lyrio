import { ApiProperty } from "@nestjs/swagger";

import { IsOptional, IsEmail } from "class-validator";

import { IsUsername } from "@/common/validators";

export class CheckAvailabilityRequestDto {
  @ApiProperty({ required: false })
  @IsUsername()
  @IsOptional()
  readonly username?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  readonly email?: string;
}
