import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

import { ContestEntity } from "./contest.entity";

@Entity("contest_issue")
@Index(["contestId", "submitTime"])
@Index(["contestId", "submitterId", "submitTime"])
@Index(["contestId", "submitterId", "replyTime"])
export class ContestIssueEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ContestEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  contest: Promise<ContestEntity>;

  @Column()
  contestId: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  submitter: Promise<UserEntity>;

  @Column()
  submitterId: number;

  @Column({ type: "datetime" })
  submitTime: Date;

  @Column({ type: "text" })
  issueContent: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  replier: Promise<UserEntity>;

  @Column({ nullable: true })
  replierId: number;

  @Column({ type: "datetime", nullable: true })
  replyTime: Date;

  @Column({ type: "text", nullable: true })
  replyContent: string;
}
