import { Module } from "@nestjs/common";

import { ClusterService } from "./cluster.service";

@Module({
  providers: [ClusterService],
  exports: [ClusterService]
})
export class ClusterModule {}
