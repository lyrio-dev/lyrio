import { Module, forwardRef } from "@nestjs/common";

import { CorsController } from "./cors.controller";
import { ConfigModule } from "@/config/config.module";

@Module({
  imports: [forwardRef(() => ConfigModule)],
  controllers: [CorsController]
})
export class CorsModule {}
