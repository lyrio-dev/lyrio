import { ApiProperty } from "@nestjs/swagger";

export class DiscussionOrReplyReactionsDto {
  @ApiProperty()
  count: Record<string, number>;

  @ApiProperty()
  currentUserReactions: string[];
}
