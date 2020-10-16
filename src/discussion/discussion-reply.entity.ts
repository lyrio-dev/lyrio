import { Entity, PrimaryGeneratedColumn, Index, Column, ManyToOne, JoinColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

import { DiscussionEntity } from "./discussion.entity";

@Entity("discussion_reply")
@Index(["discussionId", "id", "isPublic"])
@Index(["discussionId", "id", "publisherId"])
export class DiscussionReplyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "mediumtext" })
  content: string;

  @Column({ type: "datetime" })
  @Index()
  publishTime: Date;

  @Column({ type: "datetime", nullable: true })
  @Index()
  editTime: Date;

  @Column({ type: "boolean" })
  isPublic: boolean;

  @ManyToOne(() => DiscussionEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  discussion: Promise<DiscussionEntity>;

  @Column()
  @Index()
  discussionId: number;

  @ManyToOne(() => UserEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  publisher: Promise<UserEntity>;

  @Column()
  @Index()
  publisherId: number;
}
