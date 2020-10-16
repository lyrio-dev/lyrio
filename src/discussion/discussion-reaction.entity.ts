import { Entity, Index, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { MAX_EMOJI_LENGTH } from "@/common/validators";

import { DiscussionEntity } from "./discussion.entity";

@Entity("discussion_reaction")
@Index(["discussionId", "userId", "emoji"])
@Index(["discussionId", "emoji"])
export class DiscussionReactionEntity {
  @PrimaryColumn()
  discussionId: number;

  @ManyToOne(() => DiscussionEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  discussion: Promise<DiscussionEntity>;

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
