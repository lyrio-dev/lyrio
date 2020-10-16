import { ApiProperty } from "@nestjs/swagger";

export class DiscussionMetaDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  publishTime: Date;

  @ApiProperty()
  editTime: Date;

  @ApiProperty()
  sortTime: Date;

  @ApiProperty()
  replyCount: number;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  publisherId: number;

  @ApiProperty()
  problemId?: number;
}
