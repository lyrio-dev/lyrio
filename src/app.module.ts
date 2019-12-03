import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod
} from "@nestjs/common";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "./config/config.module";
import { UserModule } from "./user/user.module";
import { AuthMiddleware } from "./user/auth.middleware";
import { CorsModule } from "./cors/cors.module";

@Module({
  imports: [DatabaseModule, ConfigModule, UserModule, CorsModule],
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
