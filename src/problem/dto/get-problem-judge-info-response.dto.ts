import { ApiProperty } from "@nestjs/swagger";

import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemJudgeInfo } from "../judge-info/problem-judge-info.interface";

export enum GetProblemJudgeInfoResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetProblemJudgeInfoResponseDto {
  @ApiProperty()
  error?: GetProblemJudgeInfoResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty()
  judgeInfo?: ProblemJudgeInfo;

  @ApiProperty()
  haveWritePermission?: boolean;
}
