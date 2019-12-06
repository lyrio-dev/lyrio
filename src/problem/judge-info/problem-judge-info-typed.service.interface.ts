import { ProblemJudgeInfo } from "./problem-judge-info.interface";

export interface ProblemJudgeInfoTypedService<T extends ProblemJudgeInfo> {
  getDefaultJudgeInfo(): T;
}
