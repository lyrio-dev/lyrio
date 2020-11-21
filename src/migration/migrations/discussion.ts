/* eslint-disable */
import { Logger } from "@nestjs/common";

import { DiscussionEntity } from "@/discussion/discussion.entity";
import { DiscussionContentEntity } from "@/discussion/discussion-content.entity";
import { DiscussionReplyEntity } from "@/discussion/discussion-reply.entity";
import { HomepageService } from "@/homepage/homepage.service";
import { Locale } from "@/common/locale.type";

import { OldDatabaseArticleCommentEntity, OldDatabaseArticleEntity } from "./old-database.interface";
import { MigrationInterface } from "./migration.interface";

export const migrationDiscussion: MigrationInterface = {
  async migrate(entityManager, config, oldDatabase, queryTablePaged, app) {
    const annoucementIds: number[] = [];

    await queryTablePaged<OldDatabaseArticleEntity>(
      "article",
      "id",
      async oldArticle => {
        try {
          const discussion = new DiscussionEntity();
          discussion.id = oldArticle.id;
          discussion.title = oldArticle.title;
          discussion.publishTime = new Date(oldArticle.public_time * 1000);
          discussion.editTime =
            oldArticle.update_time && oldArticle.update_time !== oldArticle.public_time
              ? new Date(oldArticle.update_time * 1000)
              : null;
          discussion.sortTime = new Date(oldArticle.sort_time * 1000);
          discussion.replyCount = 0;
          discussion.isPublic = true;
          discussion.publisherId = oldArticle.user_id;
          discussion.problemId = oldArticle.problem_id || null;

          await entityManager.save(discussion);

          const discussionContent = new DiscussionContentEntity();
          discussionContent.discussionId = oldArticle.id;
          discussionContent.content = oldArticle.content;

          await entityManager.save(discussionContent);
        } catch (e) {
          Logger.error(`Failed to migrate discussion #${oldArticle.id}, ${e}`);
        }

        if (oldArticle.is_notice) annoucementIds.push(oldArticle.id);
      },
      1000
    );

    annoucementIds.sort((a, b) => b - a);
    if (annoucementIds.length > 0) {
      const homepageService = app.get(HomepageService);
      const settings = await homepageService.getSettings();
      settings.annnouncements = {
        items: {
          [Locale.zh_CN]: annoucementIds
        }
      };
      await homepageService.setSettings(settings);
    }

    await queryTablePaged<OldDatabaseArticleCommentEntity>(
      "article_comment",
      "id",
      async oldArticleComment => {
        try {
          const discussionReply = new DiscussionReplyEntity();
          discussionReply.id = oldArticleComment.id;
          discussionReply.content = oldArticleComment.content;
          discussionReply.publishTime = new Date(oldArticleComment.public_time * 1000);
          discussionReply.editTime = null;
          discussionReply.isPublic = true;
          discussionReply.discussionId = oldArticleComment.article_id;
          discussionReply.publisherId = oldArticleComment.user_id;

          await entityManager.save(discussionReply);
        } catch (e) {
          Logger.error(`Failed to migrate discussion reply #${oldArticleComment.id}, ${e}`);
        }
      },
      1000
    );

    Logger.log("Calculating discussion reply count");

    await entityManager.query(
      "UPDATE `discussion` SET `replyCount` = (SELECT COUNT(*) FROM `discussion_reply` WHERE `discussion_reply`.`discussionId` = `discussion`.`id`)"
    );
  }
};
