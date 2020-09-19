import { ApiProperty } from "@nestjs/swagger";

import { ProblemMetaDto } from "@/problem/dto";

import { UserMetaDto } from "@/user/dto";

import { SubmissionStatus } from "../submission-status.enum";
import { SubmissionProgressType } from "../submission-progress.interface";

// The basic meta doesn't contains information obtained from related database tables, such as problem and submitter meta
export class SubmissionBasicMetaDto {
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

  @ApiProperty({ enum: SubmissionStatus })
  status: SubmissionStatus;

  @ApiProperty()
  submitTime: Date;

  @ApiProperty()
  timeUsed: number;

  @ApiProperty()
  memoryUsed: number;
}

export class SubmissionMetaDto extends SubmissionBasicMetaDto {
  @ApiProperty()
  problem: ProblemMetaDto;

  @ApiProperty()
  problemTitle: string;

  @ApiProperty()
  submitter: UserMetaDto;

  // Only for non-finished and non-waiting submissions
  @ApiProperty()
  progressType?: SubmissionProgressType;
}
