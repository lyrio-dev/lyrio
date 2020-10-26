import { Module, forwardRef } from "@nestjs/common";

import { ConfigModule } from "@/config/config.module";

import { EventReportService } from "./event-report.service";

@Module({
  imports: [forwardRef(() => ConfigModule)],
  providers: [EventReportService],
  exports: [EventReportService]
})
export class EventReportModule {}
