import { Entity, PrimaryGeneratedColumn, Index, ManyToOne, Column, JoinColumn } from "typeorm";

import { ProblemEntity } from "./problem.entity";
import { ProblemTagEntity } from "./problem-tag.entity";

@Entity("problem_tag_map")
@Index(["problemId", "problemTagId"], { unique: true })
export class ProblemTagMapEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProblemEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @Column()
  @Index()
  problemId: number;

  @ManyToOne(() => ProblemTagEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  problemTag: Promise<ProblemTagEntity>;

  @Column()
  @Index()
  problemTagId: number;
}
