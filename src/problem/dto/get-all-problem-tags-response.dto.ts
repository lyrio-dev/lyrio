import { ApiProperty } from "@nestjs/swagger";

import { LocalizedProblemTagDto } from "./localized-problem-tag.dto";

export class GetAllProblemTagsResponseDto {
  @ApiProperty({ type: [LocalizedProblemTagDto] })
  tags: LocalizedProblemTagDto[];
}
