import { Entity, PrimaryGeneratedColumn, Index, ManyToOne, Column, JoinColumn, OneToOne } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { Locale } from "@/common/locale.type";

import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemSampleEntity } from "./problem-sample.entity";

export enum ProblemType {
  Traditional = "Traditional",
  Interaction = "Interaction",
  SubmitAnswer = "SubmitAnswer"
}

@Entity("problem")
export class ProblemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /*
   * The entity ID is NOT designed to be changed, but we need to change its ID
   * So use a "display ID" to display, and use the entity ID internally
   */
  @Column({ type: "integer", nullable: true })
  @Index({ unique: true })
  displayId: number;

  /*
   * Why put problem's type in problem table, NOT problem judge info table?
   * Because sometimes we need to know its type but don't need to know its judge info
   * e.g. When displaying the submissions page
   */
  @Column({ type: "enum", enum: ProblemType })
  type: ProblemType;

  @Column({ type: "boolean" })
  isPublic: boolean;

  @Column({ type: "datetime", nullable: true })
  publicTime: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn()
  owner: Promise<UserEntity>;

  @Column()
  ownerId: number;

  // The first of the array is its default locale
  @Column({ type: "json" })
  locales: Locale[];

  @Column({ type: "integer" })
  submissionCount: number;

  @Column({ type: "integer" })
  acceptedSubmissionCount: number;

  @OneToOne(() => ProblemSampleEntity, problemSample => problemSample.problem)
  sample: Promise<ProblemSampleEntity>;

  @OneToOne(() => ProblemJudgeInfoEntity, problemJudgeInfo => problemJudgeInfo.problem)
  judgeInfo: Promise<ProblemJudgeInfoEntity>;
}
