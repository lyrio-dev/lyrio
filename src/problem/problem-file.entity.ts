import { Entity, PrimaryColumn, ManyToOne, Column, JoinColumn, Index } from "typeorm";

import { ProblemEntity } from "@/problem/problem.entity";

export enum ProblemFileType {
  TestData = "TestData",
  AdditionalFile = "AdditionalFile"
}

@Entity("problem_file")
export class ProblemFileEntity {
  @ManyToOne(type => ProblemEntity, { onDelete: "RESTRICT" })
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @PrimaryColumn()
  problemId: number;

  @PrimaryColumn({ type: "enum", enum: ProblemFileType })
  type: ProblemFileType;

  @PrimaryColumn({ type: "varchar", length: 256 })
  filename: string;

  @Column({ type: "char", length: 36 })
  uuid: string;
}
