import { ApiProperty } from "@nestjs/swagger";

export class SignedFileUploadRequestDto {
  @ApiProperty()
  uuid: string;

  @ApiProperty({ enum: ["POST", "PUT"] })
  method: "POST" | "PUT";

  @ApiProperty()
  url: string;

  @ApiProperty()
  extraFormData?: unknown;

  @ApiProperty()
  fileFieldName?: string;
}
