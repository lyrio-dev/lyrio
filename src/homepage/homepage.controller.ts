import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { Locale } from "@/common/locale.type";
import { DiscussionService } from "@/discussion/discussion.service";
import { UserService } from "@/user/user.service";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { ProblemService } from "@/problem/problem.service";
import { SubmissionService } from "@/submission/submission.service";
import { AuditService } from "@/audit/audit.service";

import { HomepageService } from "./homepage.service";

import {
  GetHomepageRequestDto,
  GetHomepageResponseDto,
  GetHomepageResponseProblemDto,
  GetHomepageSettingsResponseDto,
  GetHomepageSettingsResponseError,
  UpdateHomepageSettingsRequestDto,
  UpdateHomepageSettingsResponseDto,
  UpdateHomepageSettingsResponseError
} from "./dto";

@ApiTags("Homepage")
@Controller("homepage")
export class HomepageController {
  constructor(
    private readonly homepageService: HomepageService,
    private readonly userService: UserService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly discussionService: DiscussionService,
    private readonly problemService: ProblemService,
    private readonly submissionService: SubmissionService,
    private readonly auditService: AuditService
  ) {}

  @Get("getHomepage")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get homepage settings and contents."
  })
  async getHomepage(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: GetHomepageRequestDto
  ): Promise<GetHomepageResponseDto> {
    const homepageSettings = await this.homepageService.getSettings();

    const noticeLocale =
      request.locale in homepageSettings.notice.contents
        ? request.locale
        : (Object.keys(homepageSettings.notice.contents)[0] as Locale);
    const notice =
      homepageSettings.notice.enabled && noticeLocale ? homepageSettings.notice.contents[noticeLocale] : null;

    const annnouncementsLocale =
      request.locale in homepageSettings.annnouncements.items
        ? request.locale
        : (Object.keys(homepageSettings.annnouncements.items)[0] as Locale);
    const annnouncementIds = annnouncementsLocale ? homepageSettings.annnouncements.items[annnouncementsLocale] : [];

    const [annnouncements, topUsers, latestUpdatedProblems] = await Promise.all([
      this.discussionService
        .findDiscussionsByExistingIds(annnouncementIds)
        .then(discussions =>
          Promise.all(
            discussions.filter(x => x).map(discussion => this.discussionService.getDiscussionMeta(discussion))
          )
        ),
      this.homepageService
        .getTopUsers()
        .then(users => Promise.all(users.map(user => this.userService.getUserMeta(user, currentUser)))),
      (async () => {
        const problems = await this.homepageService.getLatestUpdatedProblems();
        const acceptedSubmissions =
          currentUser && (await this.submissionService.getUserLatestSubmissionByProblems(currentUser, problems, true));
        const nonAcceptedSubmissions =
          currentUser &&
          (await this.submissionService.getUserLatestSubmissionByProblems(
            currentUser,
            problems.filter(problem => !acceptedSubmissions.has(problem.id))
          ));
        return await Promise.all(
          problems.map(async problem => {
            const submission =
              currentUser && (acceptedSubmissions.get(problem.id) || nonAcceptedSubmissions.get(problem.id));

            return <GetHomepageResponseProblemDto>{
              meta: await this.problemService.getProblemMeta(problem),
              title: await this.problemService.getProblemLocalizedTitle(
                problem,
                problem.locales.includes(request.locale) ? request.locale : problem.locales[0]
              ),
              submission: submission && (await this.submissionService.getSubmissionBasicMeta(submission))
            };
          })
        );
      })()
    ]);

    return {
      notice,
      noticeLocale,
      annnouncements,
      annnouncementsLocale,
      hitokoto: homepageSettings.hitokoto.enabled ? homepageSettings.hitokoto : null,
      countdown: homepageSettings.countdown.enabled ? homepageSettings.countdown : null,
      friendLinks: homepageSettings.friendLinks.enabled ? homepageSettings.friendLinks : null,
      topUsers,
      latestUpdatedProblems
    };
  }

  @Get("getHomepageSettings")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get homepage settings for editing."
  })
  async getHomepageSettings(@CurrentUser() currentUser: UserEntity): Promise<GetHomepageSettingsResponseDto> {
    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.EditHomepage)))
      return {
        error: GetHomepageSettingsResponseError.PERMISSION_DENIED
      };

    const settings = await this.homepageService.getSettings();

    const annnouncementDiscussionIds = Object.values(settings.annnouncements.items).flat();
    const annnouncementDiscussions = await this.discussionService.findDiscussionsByExistingIds(
      annnouncementDiscussionIds
    );

    return {
      annnouncementDiscussions: await Promise.all(
        annnouncementDiscussions.map(async discussion => await this.discussionService.getDiscussionMeta(discussion))
      ),
      settings
    };
  }

  @Post("updateHomepageSettings")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update homepage settings"
  })
  async updateHomepageSettings(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateHomepageSettingsRequestDto
  ): Promise<UpdateHomepageSettingsResponseDto> {
    if (!(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.EditHomepage)))
      return {
        error: UpdateHomepageSettingsResponseError.PERMISSION_DENIED
      };

    const annnouncementDiscussionIds = Object.values(request.settings.annnouncements.items).flat();
    const annnouncementDiscussions = await this.discussionService.findDiscussionsByExistingIds(
      annnouncementDiscussionIds
    );
    const existingIds = new Set(annnouncementDiscussions.map(discussion => discussion.id));

    const nonexistingId = annnouncementDiscussionIds.find(id => !existingIds.has(id));
    if (nonexistingId != null)
      return {
        error: UpdateHomepageSettingsResponseError.NO_SUCH_DISCUSSION,
        errorDiscussionId: nonexistingId
      };

    const oldSettings = await this.homepageService.getSettings();
    await this.homepageService.setSettings(request.settings);

    await this.auditService.log("homepage.update", {
      old: oldSettings,
      new: request.settings
    });

    return {};
  }
}
