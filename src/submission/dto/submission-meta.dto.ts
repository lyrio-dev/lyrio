import { ApiProperty } from "@nestjs/swagger";
import { ProblemMetaDto } from "@/problem/dto";

import { SubmissionStatus } from "../submission-status.enum";
import { UserMetaDto } from "@/user/dto";
import { SubmissionProgressType } from "../submission-progress.interface";

export class SubmissionMetaDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  codeLanguage: string;

  @ApiProperty()
  answerSize: number;

  @ApiProperty()
  score: number;

  @ApiProperty()
  status: SubmissionStatus;

  @ApiProperty()
  submitTime: Date;

  @ApiProperty()
  problem: ProblemMetaDto;

  @ApiProperty()
  problemTitle: string;

  @ApiProperty()
  submitter: UserMetaDto;

  // Only for non-finished and non-waiting submissions
  @ApiProperty({
    enum: Object.values(SubmissionProgressType)
      .map(s => Number(s))
      .filter(x => !isNaN(x))
  })
  progressMeta?: SubmissionProgressType;

  // Below only for some problem types
  @ApiProperty()
  timeUsed: number;

  @ApiProperty()
  memoryUsed: number;
}
