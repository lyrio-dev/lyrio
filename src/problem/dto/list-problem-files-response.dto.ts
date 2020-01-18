import { ApiProperty } from "@nestjs/swagger";

import { ProblemFileDto } from "./problem-file.dto";

export enum ListProblemFilesResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class ListProblemFilesResponseDto {
  @ApiProperty()
  error?: ListProblemFilesResponseError;

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  problemFiles?: ProblemFileDto[];
}
