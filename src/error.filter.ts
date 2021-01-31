import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from "@nestjs/common";

import { Response } from "express"; // eslint-disable-line import/no-extraneous-dependencies

import { RequestWithSession } from "./auth/auth.middleware";
import { EventReportService, EventReportType } from "./event-report/event-report.service";

const logger = new Logger("ErrorFilter");

@Catch()
export class ErrorFilter implements ExceptionFilter {
  constructor(private readonly eventReportService: EventReportService) {}

  catch(error: Error, host: ArgumentsHost) {
    const contextType = host.getType();
    let request: RequestWithSession;
    if (contextType === "http") {
      request = host.switchToHttp().getRequest<RequestWithSession>();
      const response = host.switchToHttp().getResponse<Response>();
      if (error instanceof HttpException) response.status(error.getStatus()).send(error.getResponse());
      else
        response.status(500).send({
          error: String(error),
          stack: error?.stack
        });
    }

    if (!(error instanceof HttpException)) {
      if (error instanceof Error) {
        if (this.isignoredError(error)) return;

        logger.error(error.message, error.stack);
      } else logger.error(error);

      this.eventReportService.report({
        type: EventReportType.Error,
        error,
        request,
        message: "ErrorFilter has caught a uncaught exception."
      });
    }
  }

  isignoredError(error: Error) {
    if (error.message.includes("Too many connections")) return true;
    if (error.message === "connect ETIMEDOUT") return true;
    if (error.message === "Connection lost: The server closed the connection.") return true;
    if (error.message === "read ECONNRESET") return true;

    return false;
  }
}
