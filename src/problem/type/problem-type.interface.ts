import { ValidationError } from "class-validator";

import { ProblemJudgeInfo } from "./problem-judge-info.interface";
import { ProblemSubmissionContent } from "./problem-submission-content.interface";

export interface ProblemTypeInterface<
  JudgeInfo extends ProblemJudgeInfo,
  SubmissionContent extends ProblemSubmissionContent
> {
  getDefaultJudgeInfo(): JudgeInfo;
  validateSubmissionContent(submissionContent: SubmissionContent): ValidationError[];
  getCodeLanguageFromSubmissionContent(submissionContent: SubmissionContent): string;
  getAnswerSizeFromSubmissionContent(submissionContent: SubmissionContent): number;
}
