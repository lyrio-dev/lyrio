import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from "@nestjs/common";

import { Request } from "express"; // eslint-disable-line import/no-extraneous-dependencies
import { GoogleRecaptchaModule } from "@nestlab/google-recaptcha";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ErrorFilter } from "./error.filter";
import { RecaptchaFilter } from "./recaptcha.filter";
import { AuthMiddleware } from "./auth/auth.middleware";

import { ConfigModule } from "./config/config.module";
import { RedisModule } from "./redis/redis.module";
import { DatabaseModule } from "./database/database.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { CorsModule } from "./cors/cors.module";
import { GroupModule } from "./group/group.module";
import { ProblemModule } from "./problem/problem.module";
import { ProblemTypeModule } from "./problem-type/problem-type.module";
import { LocalizedContentModule } from "./localized-content/localized-content.module";
import { PermissionModule } from "./permission/permission.module";
import { FileModule } from "./file/file.module";
import { SubmissionModule } from "./submission/submission.module";
import { JudgeModule } from "./judge/judge.module";
import { DiscussionModule } from "./discussion/discussion.module";
import { MigrationModule } from "./migration/migration.module";
import { EventReportModule } from "./event-report/event-report.module";

import { ConfigService } from "./config/config.service";

export const RecaptchaModule = GoogleRecaptchaModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    secretKey: configService.config.security.recaptchaSecret,
    response: (req: Request) => String(req.headers["x-recaptcha-token"]),
    skipIf: () => !configService.config.security.recaptchaSecret
  }),
  inject: [ConfigService]
});

@Module({
  imports: [
    RecaptchaModule,
    forwardRef(() => ConfigModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => RedisModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => CorsModule),
    forwardRef(() => GroupModule),
    forwardRef(() => ProblemModule),
    forwardRef(() => ProblemTypeModule),
    forwardRef(() => LocalizedContentModule),
    forwardRef(() => PermissionModule),
    forwardRef(() => FileModule),
    forwardRef(() => SubmissionModule),
    forwardRef(() => JudgeModule),
    forwardRef(() => DiscussionModule),
    forwardRef(() => EventReportModule),
    forwardRef(() => MigrationModule)
  ],
  controllers: [AppController],
  providers: [AppService, ErrorFilter, RecaptchaFilter]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes({
      path: "*",
      method: RequestMethod.ALL
    });
  }
}
