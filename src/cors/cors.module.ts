import { Module, forwardRef } from "@nestjs/common";

import { ConfigModule } from "@/config/config.module";

import { CorsController } from "./cors.controller";

@Module({
  imports: [forwardRef(() => ConfigModule)],
  controllers: [CorsController]
})
export class CorsModule {}
