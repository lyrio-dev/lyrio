import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { ProblemEntity } from "@/problem/problem.entity";

import { ProblemSampleData } from "./problem-sample-data.interface";

@Entity("problem_sample")
export class ProblemSampleEntity {
  @OneToOne(() => ProblemEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @PrimaryColumn()
  problemId: number;

  @Column({ type: "json" })
  data: ProblemSampleData;
}
