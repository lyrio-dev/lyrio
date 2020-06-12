import { Module, forwardRef } from "@nestjs/common";

import { ConfigModule } from "@/config/config.module";

import { ProblemTypeFactoryService } from "./problem-type-factory.service";
import { ProblemTypeTraditionalService } from "./types/traditional/problem-type.service";
import { ProblemTypeInteractionService } from "./types/interaction/problem-type.service";
import { CodeLanguageModule } from "@/code-language/code-language.module";

@Module({
  imports: [forwardRef(() => ConfigModule), forwardRef(() => CodeLanguageModule)],
  providers: [ProblemTypeFactoryService, ProblemTypeTraditionalService, ProblemTypeInteractionService],
  exports: [ProblemTypeFactoryService]
})
export class ProblemTypeModule {}
