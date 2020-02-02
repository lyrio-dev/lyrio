import { ApiProperty } from "@nestjs/swagger";

import { ProblemFileDto } from "./problem-file.dto";
import { ProblemMetaDto } from "./problem-meta.dto";

export enum GetProblemAllFilesResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetProblemAllFilesResponseDto {
  @ApiProperty()
  error?: GetProblemAllFilesResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  testdata?: ProblemFileDto[];

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  additionalFiles?: ProblemFileDto[];

  @ApiProperty()
  haveWritePermission?: boolean;
}
