import { ApiProperty } from "@nestjs/swagger";

import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { SubmissionProgressVisibility } from "@/submission/submission-progress.gateway";

import { ContestOptions } from "../contest-options.interface";

export class ContestOptionsDto implements ContestOptions {
  @ApiProperty()
  @IsBoolean()
  allowSeeingProblemTags: boolean;

  @ApiProperty()
  @IsBoolean()
  allowAccessingTestData: boolean;

  @ApiProperty()
  @IsBoolean()
  allowSeeingOthersSubmissions: boolean;

  @ApiProperty()
  @IsBoolean()
  allowSeeingOthersSubmissionDetail: boolean;

  @ApiProperty()
  @IsEnum(SubmissionProgressVisibility)
  submissionMetaVisibility: SubmissionProgressVisibility;

  @ApiProperty()
  @IsEnum(SubmissionProgressVisibility)
  submissionTestcaseResultVisibility: SubmissionProgressVisibility;

  @ApiProperty()
  @IsEnum(SubmissionProgressVisibility)
  submissionTestcaseDetailVisibility: SubmissionProgressVisibility;

  @ApiProperty()
  @IsBoolean()
  showProblemStatistics: boolean;

  @ApiProperty()
  @IsBoolean()
  enableIssues: boolean;

  @ApiProperty()
  @IsBoolean()
  runPretestsOnly: boolean;

  @ApiProperty({ enum: ["Pretests", "Real", "None"] })
  @IsEnum(["Pretests", "Real", "None"])
  ranklistDuringContest: "Pretests" | "Real" | "None";

  @ApiProperty()
  @IsInt()
  freezeRanklistForParticipantsWhen: number;
}
