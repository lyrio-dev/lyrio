import { Module } from "@nestjs/common";

import { EventReportService } from "./event-report.service";

@Module({
  providers: [EventReportService],
  exports: [EventReportService]
})
export class EventReportModule {}
