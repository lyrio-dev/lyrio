import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn, Index } from "typeorm";

import { SubmissionProgress } from "./submission-progress.interface";
import { SubmissionEntity } from "./submission.entity";

@Entity("submission_detail")
export class SubmissionDetailEntity {
  @OneToOne(() => SubmissionEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  submission: Promise<SubmissionEntity>;

  @PrimaryColumn()
  submissionId: number;

  @Column({ type: "json" })
  content: unknown;

  @Column({ type: "char", length: 36, nullable: true })
  @Index({ unique: true })
  fileUuid: string;

  @Column({ type: "json", nullable: true })
  result: SubmissionProgress;
}
