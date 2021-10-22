import type { SubmissionBasicMetaDto } from "@/submission/dto";

import { ParticipantDetail } from "./contest-participant.entity";
import { ContestEntity } from "./contest.entity";

export interface ContestTypeServiceInterface<ContestTypeOptions, ParticipantDetailInfo> {
  /**
   * @return Valid or not.
   */
  validateConfig(contestTypeOptions: ContestTypeOptions, problemIds: number[]): boolean;

  /**
   * Update the participant's score and detail after a submission updated.
   *
   * Calls to this function is serialized for each participant.
   */
  onSubmissionUpdated(
    problemId: number,
    userId: number,
    startTime: Date,
    submission: SubmissionBasicMetaDto,
    participant: ParticipantDetail<ParticipantDetailInfo>,
    contestTypeOptions: ContestTypeOptions
  ): Promise<void>;
}
