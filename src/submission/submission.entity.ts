import { Entity, PrimaryGeneratedColumn, Index, ManyToOne, Column, JoinColumn, OneToOne } from "typeorm";

import { SubmissionStatus } from "./submission-status.enum";

import { UserEntity } from "@/user/user.entity";
import { ProblemEntity } from "@/problem/problem.entity";
import { SubmissionDetailEntity } from "./submission-detail.entity";

@Entity("submission")
@Index(["isPublic", "problemId", "submitterId", "status", "codeLanguage"])
@Index(["isPublic", "problemId", "status", "codeLanguage"])
@Index(["isPublic", "problemId", "codeLanguage", "submitterId"])
@Index(["isPublic", "submitterId", "status", "codeLanguage"])
@Index(["isPublic", "codeLanguage", "submitterId"])
@Index(["isPublic", "status", "codeLanguage"])
@Index(["problemId", "submitterId"])
@Index(["problemId", "submitterId", "status"])
export class SubmissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // An uuid to identify the judge task of the submission
  // (different for each rejudge, cleared on finish judging)
  @Column({ type: "varchar", nullable: true, length: 36 })
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
  // End: Fields for "some of the problem types" only

  @Column({ type: "integer", nullable: true })
  @Index()
  score: number;

  @Column({ type: "enum", enum: SubmissionStatus })
  @Index()
  status: SubmissionStatus;

  @Column({ type: "datetime" })
  @Index()
  submitTime: Date;

  @ManyToOne(type => ProblemEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @Column()
  @Index()
  problemId: number;

  @ManyToOne(type => UserEntity)
  @JoinColumn()
  submitter: Promise<UserEntity>;

  @Column()
  @Index()
  submitterId: number;

  @OneToOne(
    type => SubmissionDetailEntity,
    submissionDetail => submissionDetail.submission
  )
  detail: Promise<SubmissionDetailEntity>;
}
