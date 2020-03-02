import { Controller, Post, Headers } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AppService } from "./app.service";
import { ConfigService } from "./config/config.service";

@ApiTags("App")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly configService: ConfigService) {}

  @ApiOperation({
    summary: "Run maintaince tasks of the app. Should be executed by cron."
  })
  @Post("runMaintainceTasks")
  async runMaintainceTasks(@Headers("maintaince-key") key: string): Promise<string> {
    if (key !== this.configService.config.security.maintainceKey) return "Wrong maintaince key";
    await this.appService.runMaintainceTasks();
    return "";
  }
}
