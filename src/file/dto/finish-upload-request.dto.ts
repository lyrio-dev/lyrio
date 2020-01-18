import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class FinishUploadRequestDto {
  @ApiProperty()
  @IsString()
  @Length(36, 36)
  readonly uuid: string;
}
