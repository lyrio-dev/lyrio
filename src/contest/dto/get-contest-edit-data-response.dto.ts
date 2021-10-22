import { ProblemMetaDto } from "@/problem/dto";
import { ApiProperty } from "@nestjs/swagger";

import { ContestMetaDto } from "./contest-meta.dto";
import { ContestLocalizedContentDto } from "./contest-information.dto";

export enum GetContestEditDataResponseError {
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetContestEditDataResponseDto {
  @ApiProperty()
  error?: GetContestEditDataResponseError;

  @ApiProperty()
  contest?: ContestMetaDto;

  @ApiProperty({ type: [ContestLocalizedContentDto] })
  localizedContents?: ContestLocalizedContentDto[];

  @ApiProperty({ type: [ProblemMetaDto] })
  problems?: ProblemMetaDto[];
}
