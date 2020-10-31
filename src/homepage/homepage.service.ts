import { Injectable } from "@nestjs/common";

import { ProblemService } from "@/problem/problem.service";
import { SettingsService } from "@/settings/settings.service";
import { UserService } from "@/user/user.service";
import { ConfigService } from "@/config/config.service";
import { UserEntity } from "@/user/user.entity";
import { ProblemEntity } from "@/problem/problem.entity";

import { HomepageSettings } from "./homepage-settings.interface";

@Injectable()
export class HomepageService {
  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
    private userService: UserService,
    private problemService: ProblemService
  ) {}

  async getSettings(): Promise<HomepageSettings> {
    return await this.settingsService.get(HomepageSettings);
  }

  async setSettings(settings: HomepageSettings): Promise<void> {
    await this.settingsService.set(settings);
  }

  async getTopUsers(): Promise<UserEntity[]> {
    const [users] = await this.userService.getUserList(
      this.configService.config.preference.misc.sortUserByRating ? "rating" : "acceptedProblemCount",
      0,
      this.configService.config.preference.pagination.homepageUserList
    );
    return users;
  }

  async getLatestUpdatedProblems(): Promise<ProblemEntity[]> {
    return await this.problemService.getLatestUpdatedProblems(
      this.configService.config.preference.pagination.homepageProblemList
    );
  }
}
