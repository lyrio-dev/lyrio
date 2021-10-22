import { Injectable } from "@nestjs/common";

import moment from "moment";

import { ParticipantDetail } from "@/contest/contest-participant.entity";
import { ContestTypeServiceInterface } from "@/contest/contest-type-service.interface";
import { restrictProperties } from "@/common/restrict-properties";
import { SubmissionBasicMetaDto } from "@/submission/dto";
import { SubmissionStatus } from "@/submission/submission-status.enum";

interface ContestTypeOptionsBasic {
  problemConfig: Record<
    number,
    {
      fullScore: number;
      fullScoreCodeforcesDecreasing: boolean;
    }
  >;
  useBestSubmission: boolean; // Otherwise use latest ***valid*** submission
}

type ParticipantDetailInfoBasic = Record<
  number,
  {
    failedAttempts: number;
    calculatedScore: number;
  }
>;

@Injectable()
export class ContestTypeBasicService
  implements ContestTypeServiceInterface<ContestTypeOptionsBasic, ParticipantDetailInfoBasic> {
  constructor() {}

  validateConfig(contestTypeOptions: ContestTypeOptionsBasic, problemIds: number[]): boolean {
    if (
      typeof contestTypeOptions.useBestSubmission !== "boolean" ||
      typeof contestTypeOptions.problemConfig !== "object" ||
      Object.entries(contestTypeOptions.problemConfig).some(
        ([problemId, config]) =>
          !problemIds.includes(Number(problemId)) ||
          !(
            (config.fullScore > 0 && Number.isSafeInteger(config.fullScore)) ||
            !(typeof config.fullScoreCodeforcesDecreasing === "boolean")
          )
      )
    )
      return false;

    restrictProperties(contestTypeOptions, ["problemConfig", "useBestSubmission"]);
    Object.values(contestTypeOptions.problemConfig).forEach(config =>
      restrictProperties(config, ["fullScore", "fullScoreCodeforcesDecreasing"])
    );

    return true;
  }

  async onSubmissionUpdated(
    problemId: number,
    userId: number,
    startTime: Date,
    submission: SubmissionBasicMetaDto,
    detail: ParticipantDetail<ParticipantDetailInfoBasic>,
    contestTypeOptions: ContestTypeOptionsBasic
  ): Promise<void> {
    const { fullScore, fullScoreCodeforcesDecreasing } = contestTypeOptions.problemConfig[problemId] || { fullScore: 100, fullScoreCodeforcesDecreasing: false };

    detail.info ??= {};
    detail.info[problemId] ??= {
      failedAttempts: 0,
      calculatedScore: null
    };

    const problemInfo = detail.info[problemId];

    const currentFullScore = !fullScoreCodeforcesDecreasing
      ? fullScore
      : this.getCodeforcesDecreasedFullScore(fullScore, startTime, submission.submitTime, problemInfo.failedAttempts);

    if (submission.status !== SubmissionStatus.Accepted) problemInfo.failedAttempts++;

    const calculatedScore = Math.min(Math.round((currentFullScore * submission.score) / 100), currentFullScore);
    if (
      problemInfo.calculatedScore == null ||
      !contestTypeOptions.useBestSubmission ||
      calculatedScore > problemInfo.calculatedScore
    ) {
      detail.score = detail.score - (problemInfo.calculatedScore || 0) + calculatedScore;
      problemInfo.calculatedScore = calculatedScore;
      detail.usedSubmissionIdForProblem[problemId] = submission.id;
    }
  }

  private getCodeforcesDecreasedFullScore(
    fullScore: number,
    startTime: Date,
    submitTime: Date,
    failedAttemptsBefore: number
  ): number {
    const decreasePerMinute = (fullScore / 500) * 2;
    const minutesElapsed = Math.floor(moment(startTime).diff(submitTime, "minute"));

    const decreaseForFailedAttempts = failedAttemptsBefore * 50;
    const decreaseForTime = decreasePerMinute * minutesElapsed;

    return Math.max(Math.round(fullScore * 0.3), fullScore - decreaseForFailedAttempts - decreaseForTime) || 1;
  }
}
