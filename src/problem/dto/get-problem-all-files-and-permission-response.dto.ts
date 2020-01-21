import { ApiProperty } from "@nestjs/swagger";

import { ProblemFileDto } from "./problem-file.dto";
import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemPermissionType } from "../problem.service";

export enum GetProblemAllFilesAndPermissionResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetProblemAllFilesAndPermissionResponseDto {
  @ApiProperty()
  error?: GetProblemAllFilesAndPermissionResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  testdata?: ProblemFileDto[];

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  additionalFiles?: ProblemFileDto[];

  @ApiProperty()
  permission?: Record<ProblemPermissionType, boolean>;
}
