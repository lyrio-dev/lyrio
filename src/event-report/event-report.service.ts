import { Injectable, Logger } from "@nestjs/common";

import moment from "moment";
import ProxyAgent from "proxy-agent";
import { Telegraf } from "telegraf";
import randomstring from "randomstring";

import { ConfigService } from "@/config/config.service";
import { ClusterService } from "@/cluster/cluster.service";
import { RequestWithSession } from "@/auth/auth.middleware";

const logger = new Logger("EventReporter");

export enum EventReportType {
  Error = "Error",
  Warning = "Warning",
  Info = "Info",
  Success = "Success"
}

const emoji: Record<EventReportType, string> = {
  [EventReportType.Error]: "❌",
  [EventReportType.Warning]: "⚠️",
  [EventReportType.Info]: "ℹ️",
  [EventReportType.Success]: "✅"
};

interface EventMessage {
  message: string;
  filename: string;
  fileContent: string;
}

const IPC_CHANNEL = "event-report";

export function escapeTelegramHtml(text: string) {
  return text.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
}

@Injectable()
export class EventReportService {
  readonly enabled: boolean;

  private readonly telegramBot: Telegraf;

  constructor(private readonly configService: ConfigService, private readonly clusterSerivce: ClusterService) {
    const eventReportConfig = this.configService.config.eventReport;
    this.enabled = !!eventReportConfig.telegramBotToken;
    if (!this.enabled) return;

    // A telegram bot could only be logged-in on one client
    // So login only on master process
    if (this.clusterSerivce.isMaster) {
      this.telegramBot = eventReportConfig.telegramBotToken
        ? new Telegraf(eventReportConfig.telegramBotToken, {
            telegram: {
              // ProxyAgent's typing is wrong
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              agent: eventReportConfig.proxyUrl ? (new ProxyAgent(eventReportConfig.proxyUrl) as any) : null,
              ...(eventReportConfig.telegramApiRoot
                ? {
                    apiRoot: eventReportConfig.telegramApiRoot
                  }
                : null)
            }
          })
        : null;
      if (this.telegramBot) this.telegramBot.launch();

      // Listen worker process's message
      this.clusterSerivce.onMessageFromWorker<EventMessage>(IPC_CHANNEL, message => this.doReport(message));
    }
  }

  async report({
    type,
    error,
    request,
    message
  }: {
    type: EventReportType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error?: any;
    request?: RequestWithSession;
    message?: string;
  }) {
    if (!this.enabled) return;

    try {
      const { siteName } = this.configService.config.preference;
      const now = moment().format("YYYY-MM-DD HH:mm:ss");
      const eventId = randomstring.generate({ length: 8, charset: "numeric" });
      const errorDisplayMessage = error && ("stack" in error ? error.stack : JSON.stringify(error, null, 2));

      let requestInfo = "";
      let requestBody = "";
      if (request) {
        const url = request.originalUrl;
        const { ip } = request;
        const user = request.session?.user;
        const userInfo = user ? `#${user.id} ${user.username}` : "";

        requestInfo = `\nRequest URL: ${url}\nClientIP: ${ip}\n`;
        if (userInfo) requestInfo += `User: ${userInfo}\n`;

        if (request.body) {
          requestBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body, null, 2);
        }
      }

      let finalMessage = `[${siteName}] ${emoji[type]} Event #${eventId} (${type}) at ${now}\n${requestInfo}`;
      if (message) finalMessage += `\n${message}\n`;
      if (errorDisplayMessage) finalMessage += `\n${errorDisplayMessage}`;

      this.clusterSerivce.postMessageToMaster(IPC_CHANNEL, <EventMessage>{
        message: finalMessage,
        filename: requestBody && `RequestBody_${eventId}.json`,
        fileContent: requestBody
      });
    } catch (e) {
      if (e instanceof Error) logger.error(e.message, e.stack);
      else logger.error(e);
    }
  }

  private async doReport(message: EventMessage) {
    await this.telegramBot.telegram.sendMessage(
      this.configService.config.eventReport.sentTo,
      `<pre>${escapeTelegramHtml(message.message.trim())}</pre>`,
      {
        parse_mode: "HTML"
      }
    );

    if (message.filename) {
      await this.telegramBot.telegram.sendDocument(this.configService.config.eventReport.sentTo, {
        filename: message.filename,
        source: Buffer.from(message.fileContent)
      });
    }
  }
}
