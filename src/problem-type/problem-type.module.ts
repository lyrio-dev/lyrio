import { Module, forwardRef } from "@nestjs/common";

import { ConfigModule } from "@/config/config.module";

import { ProblemTypeFactoryService } from "./problem-type-factory.service";
import { ProblemTypeTraditionalService } from "./types/traditional/problem-type-traditional.service";

@Module({
  imports: [forwardRef(() => ConfigModule)],
  providers: [ProblemTypeFactoryService, ProblemTypeTraditionalService],
  exports: [ProblemTypeFactoryService]
})
export class ProblemTypeModule {}
