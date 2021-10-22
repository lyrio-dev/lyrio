import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

import { ContestEntity } from "./contest.entity";

export interface ParticipantDetail<ParticipantDetailInfo> {
  /**
   * The submission ID of status shown in the participant contest page, next to each problem.
   */
  usedSubmissionIdForProblem: Record<number, number>;

  /**
   * The info is maintained differently for each contest type.
   */
  info: ParticipantDetailInfo;

  /**
   * The participant's total score in the ranlist.
   */
  score: number;
}

interface ParticipantDetailWithLatestSubmissionId<ParticipantDetailInfo>
  extends ParticipantDetail<ParticipantDetailInfo> {
  /**
   * One participant's detail info is maintained linearly.
   * If a earlier submission is updated after a later submission, the detail info will be cleared and rebuilt.
   */
  latestSubmissionId: number;
}

@Entity("contest_participant")
@Index(["contestId", "userId", "scoreReal"])
@Index(["contestId", "userId", "scoreVisibleDuringContest"])
export class ContestParticipantEntity<ParticipantDetailInfo = unknown> {
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

  @Column({ type: "datetime" })
  startTime: Date;

  // The contest options may set to let participants see a restrict ranklist only. Such as show pretest result or freeze ranklist after some time.
  // These two are maintained separatedly.

  @Column({ type: "double" })
  scoreVisibleDuringContest: number;

  @Column({ type: "json" })
  detailVisibleDuringContest: ParticipantDetailWithLatestSubmissionId<ParticipantDetailInfo>;

  @Column({ type: "double", nullable: true })
  scoreReal: number;

  @Column({ type: "json", nullable: true })
  detailReal: ParticipantDetailWithLatestSubmissionId<ParticipantDetailInfo>;
}
