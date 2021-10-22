import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { ProblemEntity } from "@/problem/problem.entity";

import { ContestEntity } from "./contest.entity";

@Entity("contest_participant_problem_statistics")
@Index(["contestId", "userId"])
@Index(["contestId", "problemId", "isReal", "accepted"])
@Index(["contestId", "problemId", "isReal", "submitted"])
export class ContestParticipantProblemStatisticsEntity {
  @ManyToOne(() => ContestEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  contest: Promise<ContestEntity>;

  @PrimaryColumn()
  contestId: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  user: Promise<UserEntity>;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => ProblemEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  problem: Promise<ProblemEntity>;

  @PrimaryColumn()
  problemId: number;

  @Column({ type: "boolean" })
  isReal: boolean;

  @Column({ type: "boolean", default: false })
  accepted: boolean;

  @Column({ type: "boolean", default: false })
  submitted: boolean;
}
