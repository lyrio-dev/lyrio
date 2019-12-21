import { ApiProperty } from "@nestjs/swagger";
import { ProblemMetaDto } from "./problem-meta.dto";
import { Locale } from "@/common/locale.type";

export enum QueryProblemSetErrorDto {
  TAKE_TOO_MANY = "TAKE_TOO_MANY"
}

export class QueryProblemSetResponseItemDto {
  @ApiProperty()
  meta: ProblemMetaDto;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: Locale })
  titleLocale: Locale;

  // TODO:
  // submissionCount
  // acceptedSubmissionCount
  // difficult
  // tags
}

export class QueryProblemSetResponseDto {
  @ApiProperty({ enum: QueryProblemSetErrorDto })
  error?: QueryProblemSetErrorDto;

  @ApiProperty({ type: QueryProblemSetResponseItemDto, isArray: true })
  result?: QueryProblemSetResponseItemDto[];

  @ApiProperty()
  count?: number;
}
