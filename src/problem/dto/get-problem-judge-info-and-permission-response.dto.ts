import { ApiProperty } from "@nestjs/swagger";

import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemPermissionType } from "../problem.service";
import { ProblemJudgeInfo } from "../judge-info/problem-judge-info.interface";

export enum GetProblemJudgeInfoAndPermissionResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetProblemJudgeInfoAndPermissionResponseDto {
  @ApiProperty()
  error?: GetProblemJudgeInfoAndPermissionResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty()
  judgeInfo?: ProblemJudgeInfo;

  @ApiProperty()
  permission?: Record<ProblemPermissionType, boolean>;
}
