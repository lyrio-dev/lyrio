import { ProblemJudgeInfo } from "./problem-judge-info.interface";

export interface ProblemTypedJudgeInfoServiceInterface<JudgeInfo extends ProblemJudgeInfo> {
  getDefaultJudgeInfo(): JudgeInfo;
}
