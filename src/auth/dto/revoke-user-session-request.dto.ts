import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsOptional } from "class-validator";

export class RevokeUserSessionRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;

  @ApiProperty({
    description: "Falsy to revoke ALL sessions of the user (except the current session, if the user is current user)"
  })
  @IsInt()
  @IsOptional()
  readonly sessionId?: number;
}
