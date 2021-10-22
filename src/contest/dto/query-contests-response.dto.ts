import { ApiProperty } from "@nestjs/swagger";

import { ContestMetaDto } from "./contest-meta.dto";

export class QueryContestsResponseDto {
  @ApiProperty({ type: [ContestMetaDto] })
  contests: ContestMetaDto[];

  @ApiProperty()
  participantCount: Record<number, number>;

  @ApiProperty({ type: [Number] })
  registeredContests: number[];

  @ApiProperty()
  count: number;
}
