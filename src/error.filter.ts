import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from "@nestjs/common";

import moment from "moment";
import { Response } from "express"; // eslint-disable-line import/no-extraneous-dependencies
import ProxyAgent from "proxy-agent";
import Telegraf, { Extra } from "telegraf";
import { TelegrafContext } from "telegraf/typings/context";
import randomstring from "randomstring";

import { ConfigService } from "./config/config.service";
import { RequestWithSession } from "./auth/auth.middleware";

@Catch()
export class ErrorFilter implements ExceptionFilter {
  readonly telegramBot: Telegraf<TelegrafContext>;

  constructor(private readonly configService: ConfigService) {
    const errorReportingConfig = this.configService.config.errorReporting;
    this.telegramBot = errorReportingConfig.telegramBotToken
      ? new Telegraf(errorReportingConfig.telegramBotToken, {
          telegram: {
            // ProxyAgent's typing is wrong
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            agent: errorReportingConfig.proxyUrl ? (new ProxyAgent(errorReportingConfig.proxyUrl) as any) : null,
            ...(errorReportingConfig.telegramApiRoot
              ? {
                  apiRoot: errorReportingConfig.telegramApiRoot
                }
              : null)
          }
        })
      : null;
    this.telegramBot.launch();
  }

  catch(error: Error, host: ArgumentsHost) {
    if (host.getType() === "http") {
      const response = host.switchToHttp().getResponse<Response>();
      if (error instanceof HttpException) response.status(error.getStatus()).send(error.getResponse());
      else
        response.status(500).send({
          error: String(error),
          stack: error?.stack
        });
    }

    if (!(error instanceof HttpException)) {
      Logger.error(`Unhandled exception ${error?.stack || error}`);

      if (this.telegramBot) {
        this.reportError(error, host).catch(e => {
          Logger.error(`Failed to report error, ${e?.stack || e}`);
        });
      }
    }
  }

  async reportError(error: Error, host: ArgumentsHost) {
    const { siteName } = this.configService.config.preference;
    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    const errorId = randomstring.generate({ length: 8, charset: "numeric" });
    const errorDisplayMessage = "stack" in error ? error.stack : JSON.stringify(error, null, 2);

    let requestInfo = "";
    let requestBody = "";
    const request = host.getType() === "http" ? host.switchToHttp().getRequest<RequestWithSession>() : null;
    if (request) {
      const url = request.originalUrl;
      const { ip } = request;
      const user = request.session?.user;
      const userInfo = user ? `#${user.id} ${user.username}` : "";

      requestInfo = `Request URL: ${url}\nClientIP: ${ip}\n`;
      if (userInfo) requestInfo += `User: ${userInfo}\n`;

      if (request.body) {
        requestBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body, null, 2);
      }
    }

    let message = `[${siteName}] Unhandled exception #${errorId} in ${host.getType()} context at ${now}\n${requestInfo}\n${errorDisplayMessage}`;
    if (!message.endsWith("\n")) message += "\n";

    const codeBlock = "```";
    await this.telegramBot.telegram.sendMessage(
      this.configService.config.errorReporting.sentTo,
      `${codeBlock}\n${message}${codeBlock}`,
      Extra.markdown().markup("")
    );

    if (requestBody) {
      await this.telegramBot.telegram.sendDocument(this.configService.config.errorReporting.sentTo, {
        filename: `RequestBody_${errorId}.json`,
        source: Buffer.from(requestBody)
      });
    }
  }
}
