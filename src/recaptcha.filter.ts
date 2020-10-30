import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";

import { GoogleRecaptchaException } from "@nestlab/google-recaptcha";
import { Response } from "express"; // eslint-disable-line import/no-extraneous-dependencies

@Catch(GoogleRecaptchaException)
export class RecaptchaFilter implements ExceptionFilter {
  catch(exception: GoogleRecaptchaException, host: ArgumentsHost) {
    if (host.getType() === "http") {
      const response = host.switchToHttp().getResponse<Response>();
      // 401 Unauthorized means recaptcha failed
      response.status(401).send(exception);
    }
  }
}
