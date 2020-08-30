import { ApiProperty } from "@nestjs/swagger";

import { IsOptional, IsInt, IsBoolean } from "class-validator";

import { IsUsername } from "@/common/validators";

export class GetUserMetaRequestDto {
  @ApiProperty({
    required: false
  })
  @IsInt()
  @IsOptional()
  readonly userId?: number;

  @ApiProperty({
    required: false
  })
  @IsUsername()
  @IsOptional()
  readonly username?: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  readonly getPrivileges?: boolean;
}
