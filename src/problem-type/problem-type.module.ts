import { Module, forwardRef } from "@nestjs/common";

import { CodeLanguageModule } from "@/code-language/code-language.module";

import { ProblemTypeFactoryService } from "./problem-type-factory.service";
import { ProblemTypeTraditionalService } from "./types/traditional/problem-type.service";
import { ProblemTypeInteractionService } from "./types/interaction/problem-type.service";
import { ProblemTypeSubmitAnswerService } from "./types/submit-answer/problem-type.service";

@Module({
  imports: [forwardRef(() => CodeLanguageModule)],
  providers: [
    ProblemTypeFactoryService,
    ProblemTypeTraditionalService,
    ProblemTypeInteractionService,
    ProblemTypeSubmitAnswerService
  ],
  exports: [ProblemTypeFactoryService]
})
export class ProblemTypeModule {}
