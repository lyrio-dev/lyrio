import { ApiProperty } from "@nestjs/swagger";

import { ProblemTagLocalizedNameDto } from "./problem-tag-localized-name.dto";

export enum GetProblemTagDetailResponseError {
  NO_SUCH_PROBLEM_TAG = "NO_SUCH_PROBLEM_TAG"
}

export class GetProblemTagDetailResponseDto {
  @ApiProperty()
  error?: GetProblemTagDetailResponseError;

  @ApiProperty()
  id?: number;

  @ApiProperty()
  color?: string;

  @ApiProperty({ type: [ProblemTagLocalizedNameDto] })
  localizedNames?: ProblemTagLocalizedNameDto[];
}
