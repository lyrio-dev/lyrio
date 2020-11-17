import { Module } from "@nestjs/common";

import { ClusterModule } from "@/cluster/cluster.module";

import { EventReportService } from "./event-report.service";

@Module({
  imports: [ClusterModule],
  providers: [EventReportService],
  exports: [EventReportService]
})
export class EventReportModule {}
