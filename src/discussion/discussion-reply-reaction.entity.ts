import { Entity, Index, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { MAX_EMOJI_LENGTH } from "@/common/validators";

import { DiscussionReplyEntity } from "./discussion-reply.entity";

@Entity("discussion_reply_reaction")
@Index(["discussionReplyId", "userId", "emoji"])
@Index(["discussionReplyId", "emoji"])
export class DiscussionReplyReactionEntity {
  @PrimaryColumn()
  discussionReplyId: number;

  @ManyToOne(() => DiscussionReplyEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  discussionReply: Promise<DiscussionReplyEntity>;

  @ManyToOne(() => UserEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  user: Promise<UserEntity>;

  @PrimaryColumn()
  @Index()
  userId: number;

  // I don't want to deal with charsets and collations
  @PrimaryColumn({ type: "varbinary", length: MAX_EMOJI_LENGTH })
  emoji: Buffer;
}
