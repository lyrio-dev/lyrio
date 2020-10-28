import { ApiProperty } from "@nestjs/swagger";

import { IsInt, Length, IsString, IsOptional } from "class-validator";

export class UpdateUserPasswordRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  readonly oldPassword?: string;

  @ApiProperty()
  @Length(6, 32)
  @IsString()
  readonly password: string;
}
