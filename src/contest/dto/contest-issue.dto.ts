import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "@/user/dto";

export class ContestIssueDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  contestId: number;

  @ApiProperty()
  submitter: UserMetaDto;

  @ApiProperty()
  submitTime: Date;

  @ApiProperty()
  issueContent: string;

  @ApiProperty()
  replier: UserMetaDto;

  @ApiProperty()
  replyTime: Date;

  @ApiProperty()
  replyContent: string;
}
