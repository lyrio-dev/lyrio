import { Module, NestModule, MiddlewareConsumer, RequestMethod } from "@nestjs/common";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthMiddleware } from "./auth/auth.middleware";

import { ConfigModule } from "./config/config.module";
import { RedisModule } from "./redis/redis.module";
import { DatabaseModule } from "./database/database.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { CorsModule } from "./cors/cors.module";
import { GroupModule } from "./group/group.module";
import { ProblemModule } from "./problem/problem.module";
import { LocalizedContentModule } from "./localized-content/localized-content.module";
import { PermissionModule } from "./permission/permission.module";
import { FileModule } from "./file/file.module";
import { SubmissionModule } from "./submission/submission.module";
import { JudgeModule } from "./judge/judge.module";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    UserModule,
    AuthModule,
    CorsModule,
    GroupModule,
    ProblemModule,
    LocalizedContentModule,
    PermissionModule,
    FileModule,
    SubmissionModule,
    JudgeModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes({
      path: "*",
      method: RequestMethod.ALL
    });
  }
}
