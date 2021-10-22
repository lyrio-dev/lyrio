import { SubmissionProgressVisibilities } from "@/submission/submission-progress.gateway";

export interface ContestOptions extends SubmissionProgressVisibilities {
  allowSeeingProblemTags: boolean;
  allowAccessingTestData: boolean;
  allowSeeingOthersSubmissions: boolean;
  allowSeeingOthersSubmissionDetail: boolean;
  showProblemStatistics: boolean;
  enableIssues: boolean;
  runPretestsOnly: boolean;
  ranklistDuringContest: "Pretests" | "Real" | "None";
  freezeRanklistForParticipantsWhen: number;
}
