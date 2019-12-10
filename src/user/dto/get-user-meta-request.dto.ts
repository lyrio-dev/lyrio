import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsBooleanString } from "class-validator";
import { IsIntString } from "@/common/validators";
import { IsUsername } from "@/common/validators";

export class GetUserMetaRequestDto {
  @ApiProperty({
    required: false
  })
  @IsIntString()
  @IsOptional()
  readonly userId?: string;

  @ApiProperty({
    required: false
  })
  @IsUsername()
  @IsOptional()
  readonly username?: string;

  @ApiProperty()
  @IsBooleanString()
  @IsOptional()
  readonly getPrivileges?: boolean;
}
