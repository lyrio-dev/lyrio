import { ApiProperty } from "@nestjs/swagger";
import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemStatementDto } from "./problem-statement.dto";

export enum GetProblemStatementsAllLocalesResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM"
}

export class GetProblemStatementsAllLocalesResponseDto {
  @ApiProperty()
  error?: GetProblemStatementsAllLocalesResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty()
  statement?: ProblemStatementDto;

  @ApiProperty()
  haveWritePermission?: boolean;
}
