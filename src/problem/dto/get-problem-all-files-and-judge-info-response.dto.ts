import { ApiProperty } from "@nestjs/swagger";

import { ProblemFileDto } from "./problem-file.dto";
import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemJudgeInfo } from "../judge-info/problem-judge-info.interface";

export enum GetProblemAllFilesAndJudgeInfoResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetProblemAllFilesAndJudgeInfoResponseDto {
  @ApiProperty()
  error?: GetProblemAllFilesAndJudgeInfoResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  testdata?: ProblemFileDto[];

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  additionalFiles?: ProblemFileDto[];

  @ApiProperty()
  judgeInfo?: ProblemJudgeInfo;
}
