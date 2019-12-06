import { Injectable } from "@nestjs/common";

import { ProblemJudgeInfoTypedService } from "./problem-judge-info-typed.service.interface";
import { ProblemJudgeInfoTraditional } from "./problem-judge-info-traditional.interface";

export { ProblemJudgeInfoTraditional } from "./problem-judge-info-traditional.interface";

@Injectable()
export class ProblemJudgeInfoTraditionalService
  implements ProblemJudgeInfoTypedService<ProblemJudgeInfoTraditional> {
  getDefaultJudgeInfo(): ProblemJudgeInfoTraditional {
    return {
      defaultTimeLimit: 1000,
      defaultMemoryLimit: 512,
      fileIo: null,
      testdata: null
    };
  }
}
