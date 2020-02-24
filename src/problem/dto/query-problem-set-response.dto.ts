import { ApiProperty } from "@nestjs/swagger";
import { ProblemMetaDto } from "./problem-meta.dto";
import { Locale } from "@/common/locale.type";
import { LocalizedProblemTagDto } from "./localized-problem-tag.dto";

export enum QueryProblemSetErrorDto {
  TAKE_TOO_MANY = "TAKE_TOO_MANY"
}

export class QueryProblemSetResponseItemDto {
  @ApiProperty()
  meta: ProblemMetaDto;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: [LocalizedProblemTagDto] })
  tags: LocalizedProblemTagDto[];

  @ApiProperty({ enum: Locale })
  resultLocale: Locale;
}

export class QueryProblemSetResponseDto {
  @ApiProperty({ enum: QueryProblemSetErrorDto })
  error?: QueryProblemSetErrorDto;

  @ApiProperty({ type: QueryProblemSetResponseItemDto, isArray: true })
  result?: QueryProblemSetResponseItemDto[];

  @ApiProperty()
  count?: number;

  @ApiProperty()
  permissionCreateProblem?: boolean;

  @ApiProperty()
  permissionManageTags?: boolean;
}
