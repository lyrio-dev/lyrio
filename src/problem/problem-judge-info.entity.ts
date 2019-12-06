import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { ProblemEntity } from "@/problem/problem.entity";

import { ProblemJudgeInfo } from "./judge-info/problem-judge-info.interface";

@Entity("problem_judge_info")
export class ProblemJudgeInfoEntity {
  @OneToOne(type => ProblemEntity)
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @PrimaryColumn()
  problemId: number;

  @Column({ type: "json" })
  judgeInfo: ProblemJudgeInfo;
}
