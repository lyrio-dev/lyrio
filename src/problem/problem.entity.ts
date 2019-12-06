import {
  Entity,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  Column,
  JoinColumn,
  OneToOne
} from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";

export enum ProblemType {
  TRADITIONAL = "TRADITIONAL"
}

@Entity("problem")
export class ProblemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /*
   * The entity ID is NOT designed to be changed, but we need to change its ID
   * So use a "display ID" to display, and use the entity ID internally
   */
  @Column({ type: "integer" })
  @Index({ unique: true })
  displayId: number;

  @Column({ type: "varchar", length: 48 })
  @Index({ unique: true })
  title: string;

  /*
   * Why put problem's type in problem table, NOT problem judge info table?
   * Because sometimes we need to know its type but don't need to know its judge info
   * e.g. When displaying the submissions page
   */
  @Column({ type: "enum", enum: ProblemType })
  type: ProblemType;

  @Column({ type: "boolean" })
  isPublic: boolean;

  @ManyToOne(type => UserEntity)
  @JoinColumn()
  owner: Promise<UserEntity>;

  @Column()
  ownerId: number;

  @OneToOne(
    type => ProblemJudgeInfoEntity,
    problemJudgeInfo => problemJudgeInfo.problem
  )
  judgeInfo: Promise<ProblemJudgeInfoEntity>;
}
