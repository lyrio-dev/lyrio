import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { ProblemEntity } from "@/problem/problem.entity";

@Entity("problem_statistics")
export class ProblemStatisticsEntity {
  @OneToOne(type => ProblemEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @PrimaryColumn()
  problemId: number;

  @Column({ type: "integer" })
  submissionCount: number;

  @Column({ type: "integer" })
  acceptedSubmissionCount: number;
}
