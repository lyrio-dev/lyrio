import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";
import { UserInformationDto } from "./user-information.dto";

export enum GetUserDetailResponseError {
  NO_SUCH_USER = "NO_SUCH_USER"
}

export class GetUserDetailResponseDto {
  @ApiProperty()
  error?: GetUserDetailResponseError;

  // TODO:
  // rating history
  // discussion threads

  @ApiProperty()
  meta?: UserMetaDto;

  @ApiProperty()
  information?: UserInformationDto;

  /**
   * Used to display the submission count for the last year in a "subway graph" like GitHub's
   * It has 53 columns, which is a natural week with 7 rows. So we need 53 * 7 + 6 = 377 days
   * to ensure there's enough data for the graph.
   */
  @ApiProperty({ type: [Number] })
  submissionCountPerDay?: number[];

  @ApiProperty()
  rank?: number;

  @ApiProperty()
  hasPrivilege?: boolean;
}
