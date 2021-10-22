import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { ProblemEntity } from "@/problem/problem.entity";
import { SubmissionEntity } from "@/submission/submission.entity";

import { ContestEntity } from "./contest.entity";

@Entity("contest_problem")
@Index(["contestId", "problemId"], { unique: true })
@Index(["contestId", "orderId"], { unique: true })
@Index(["contestId", "alias"], { unique: true })
export class ContestProblemEntity {
  @ManyToOne(() => ContestEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  contest: Promise<ContestEntity>;

  @PrimaryColumn()
  contestId: number;

  @ManyToOne(() => ProblemEntity, { onDelete: "RESTRICT" })
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @PrimaryColumn()
  problemId: number;

  @Column({ type: "integer" })
  @Index()
  orderId: number;

  @Column({ type: "varchar", length: 20 })
  alias: string;

  @ManyToOne(() => SubmissionEntity, { onDelete: "SET NULL" })
  @JoinColumn()
  firstAcceptedSubmissionDuringContest: Promise<SubmissionEntity>;

  @Column({ nullable: true })
  firstAcceptedSubmissionIdDuringContest: number;

  @ManyToOne(() => SubmissionEntity, { onDelete: "SET NULL" })
  @JoinColumn()
  firstAcceptedSubmissionReal: Promise<SubmissionEntity>;

  @Column({ nullable: true })
  firstAcceptedSubmissionIdReal: number;
}
