import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { DiscussionEntity } from "./discussion.entity";

@Entity("discussion_content")
export class DiscussionContentEntity {
  @OneToOne(() => DiscussionEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  discussion: Promise<DiscussionEntity>;

  @PrimaryColumn()
  discussionId: number;

  @Column({ type: "mediumtext" })
  content: string;
}
