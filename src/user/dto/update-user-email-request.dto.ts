import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsEmail } from "class-validator";

// TODO: add email verify
export class UpdateUserEmailRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;

  @ApiProperty()
  @IsEmail()
  readonly email: string;
}
