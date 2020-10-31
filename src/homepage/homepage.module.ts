import { Module } from "@nestjs/common";

import { DiscussionModule } from "@/discussion/discussion.module";
import { ProblemModule } from "@/problem/problem.module";
import { SubmissionModule } from "@/submission/submission.module";
import { UserModule } from "@/user/user.module";
import { AuditModule } from "@/audit/audit.module";

import { HomepageController } from "./homepage.controller";
import { HomepageService } from "./homepage.service";

@Module({
  imports: [AuditModule, UserModule, ProblemModule, SubmissionModule, DiscussionModule],
  controllers: [HomepageController],
  providers: [HomepageService]
})
export class HomepageModule {}
