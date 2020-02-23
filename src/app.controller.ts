import { Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AppService } from "./app.service";

@ApiTags("App")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: "Run scheduled tasks of the app. Should be executed by cron."
  })
  @Post("runScheduledTasks")
  async runScheduledTasks(): Promise<void> {
    await this.appService.runScheduledTasks();
  }
}
