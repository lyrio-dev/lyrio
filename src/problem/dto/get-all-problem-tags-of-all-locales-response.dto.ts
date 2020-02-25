import { ApiProperty } from "@nestjs/swagger";

import { ProblemTagLocalizedNameDto } from "./problem-tag-localized-name.dto";

export enum GetAllProblemTagsOfAllLocalesResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class ProblemTagWithAllLocalesDto {
  @ApiProperty()
  id?: number;

  @ApiProperty()
  color?: string;

  @ApiProperty({ type: [ProblemTagLocalizedNameDto] })
  localizedNames?: ProblemTagLocalizedNameDto[];
}

export class GetAllProblemTagsOfAllLocalesResponseDto {
  @ApiProperty()
  error?: GetAllProblemTagsOfAllLocalesResponseError;

  @ApiProperty({ type: [ProblemTagWithAllLocalesDto] })
  tags?: ProblemTagWithAllLocalesDto[];
}
