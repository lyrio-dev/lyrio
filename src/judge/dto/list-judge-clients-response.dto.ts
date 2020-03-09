import { ApiProperty } from "@nestjs/swagger";

import { JudgeClientInfoDto } from "./judge-client-info.dto";

export class ListJudgeClientsResponseDto {
  @ApiProperty({ type: [JudgeClientInfoDto] })
  judgeClients: JudgeClientInfoDto[];

  @ApiProperty()
  hasManagePermission: boolean;
}
