import { Module } from "@nestjs/common";

import { CorsController } from "./cors.controller";
import { ConfigModule } from "../config/config.module";

@Module({
  imports: [ConfigModule],
  controllers: [CorsController]
})
export class CorsModule {}
