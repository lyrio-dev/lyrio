import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

import { ContestPublicness, ContestType } from "../contest.entity";
import { ContestOptionsDto } from "./contest-options.dto";
import { ContestProblemDto } from "./contest-information.dto";

export class ContestMetaDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  type: ContestType;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  participantDuration: number;

  @ApiProperty({ enum: ContestPublicness })
  publicness: ContestPublicness;

  @ApiProperty({ enum: Locale, isArray: true })
  locales: Locale[];

  @ApiProperty()
  problems: ContestProblemDto[];

  @ApiProperty()
  contestOptions: ContestOptionsDto;

  @ApiProperty()
  contestTypeOptions: unknown;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  nameLocale?: Locale;
}
