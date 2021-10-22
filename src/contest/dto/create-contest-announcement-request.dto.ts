import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, ValidateNested } from "class-validator";

import { If } from "@/common/validators";

import { ContestAnnouncementLocalizedContentDto } from "./contest-announcement-localized-content.dto";

export class CreateContestAnnouncementRequestDto {
  @ApiProperty()
  @IsInt()
  contestId: number;

  @ApiProperty({ type: [ContestAnnouncementLocalizedContentDto] })
  @Type(() => ContestAnnouncementLocalizedContentDto)
  @ValidateNested({ each: true })
  @If<ContestAnnouncementLocalizedContentDto[]>(
    localizedContents => new Set(localizedContents.map(c => c.locale)).size === localizedContents.length
  )
  content: ContestAnnouncementLocalizedContentDto[];
}
