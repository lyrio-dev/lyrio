import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { SubmissionResult } from "./submission-result.interface";

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

  @Column({ type: "json", nullable: true })
  result: SubmissionResult;
}
