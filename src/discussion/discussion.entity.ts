import { Entity, PrimaryGeneratedColumn, Index, Column, ManyToOne, JoinColumn, OneToOne } from "typeorm";

import { ProblemEntity } from "@/problem/problem.entity";
import { UserEntity } from "@/user/user.entity";

import { DiscussionContentEntity } from "./discussion-content.entity";

@Entity("discussion")
@Index(["problemId", "isPublic", "sortTime", "publisherId"])
@Index(["problemId", "sortTime", "publisherId"])
export class DiscussionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 80 })
  title: string;

  @OneToOne(() => DiscussionContentEntity, discussionContent => discussionContent.discussion)
  content: Promise<DiscussionContentEntity>;

  @Column({ type: "datetime" })
  @Index()
  publishTime: Date;

  @Column({ type: "datetime", nullable: true })
  @Index()
  editTime: Date;

  @Column({ type: "datetime" })
  @Index()
  sortTime: Date;

  @Column({ type: "integer" })
  @Index()
  replyCount: number;

  @Column({ type: "boolean" })
  @Index()
  isPublic: boolean;

  @ManyToOne(() => UserEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  publisher: Promise<UserEntity>;

  @Column()
  @Index()
  publisherId: number;

  @ManyToOne(() => ProblemEntity, {
    onDelete: "CASCADE",
    nullable: true
  })
  @JoinColumn()
  problem?: Promise<ProblemEntity>;

  @Column({ nullable: true })
  @Index()
  problemId?: number;
}
