import { Module } from "@nestjs/common";

import { CorsController } from "./cors.controller";

@Module({
  controllers: [CorsController]
})
export class CorsModule {}
