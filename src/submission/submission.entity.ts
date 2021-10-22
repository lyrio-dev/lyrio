import { Entity, PrimaryGeneratedColumn, Index, ManyToOne, Column, JoinColumn, OneToOne } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { ProblemEntity } from "@/problem/problem.entity";
import { ContestEntity } from "@/contest/contest.entity";

import { SubmissionStatus } from "./submission-status.enum";
import { SubmissionDetailEntity } from "./submission-detail.entity";

@Entity("submission")
@Index(["contestId", "isPublic", "problemId", "submitterId", "status", "codeLanguage"])
@Index(["contestId", "isPublic", "problemId", "status", "codeLanguage"])
@Index(["contestId", "isPublic", "problemId", "codeLanguage", "submitterId"])
@Index(["contestId", "isPublic", "submitterId", "status", "codeLanguage"])
@Index(["contestId", "isPublic", "codeLanguage", "submitterId"])
@Index(["contestId", "isPublic", "status", "codeLanguage"])
@Index(["contestId", "problemId", "submitterId"])
@Index(["contestId", "submitterId", "status", "id"])
@Index(["contestId", "submitterId", "pretestsStatus", "id"])
@Index(["contestId", "submitTime", "submitterId"])
@Index(["contestId", "pretestsStatus"])
export class SubmissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // An uuid to identify the judge task of the submission
  // (different for each rejudge, cleared on finish judging)
  @Column({ type: "varchar", nullable: true, length: 36 })
  @Index()
  taskId: string;

  // By default it equals to the problem's isPublic
  @Column({ type: "boolean" })
  @Index()
  isPublic: boolean;

  // Start: Fields for "some of the problem types" only
  @Column({ type: "varchar", nullable: true, length: 20 })
  @Index()
  codeLanguage: string;

  @Column({ type: "integer", nullable: true })
  answerSize: number;

  @Column({ type: "integer", nullable: true })
  timeUsed: number;

  @Column({ type: "integer", nullable: true })
  memoryUsed: number;

  @Column({ type: "integer", nullable: true })
  pretestsTimeUsed: number;

  @Column({ type: "integer", nullable: true })
  pretestsMemoryUsed: number;
  // End: Fields for "some of the problem types" only

  @Column({ type: "integer", nullable: true })
  @Index()
  score: number;

  @Column({ type: "integer", nullable: true })
  pretestsScore: number;

  @Column({ type: "enum", enum: SubmissionStatus, nullable: true })
  pretestsStatus: SubmissionStatus;

  @Column({ type: "enum", enum: SubmissionStatus })
  @Index()
  status: SubmissionStatus;

  // For backward compatibility it's nullable
  @Column({ type: "integer", nullable: true })
  totalOccupiedTime: number;

  @Column({ type: "datetime" })
  @Index()
  submitTime: Date;

  @ManyToOne(() => ProblemEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @Column()
  @Index()
  problemId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn()
  submitter: Promise<UserEntity>;

  @Column()
  @Index()
  submitterId: number;

  @ManyToOne(() => ContestEntity, { onDelete: "SET NULL" })
  @JoinColumn()
  contest: Promise<ContestEntity>;

  @Column({ nullable: true })
  @Index()
  contestId: number;

  @OneToOne(() => SubmissionDetailEntity, submissionDetail => submissionDetail.submission)
  detail: Promise<SubmissionDetailEntity>;
}
