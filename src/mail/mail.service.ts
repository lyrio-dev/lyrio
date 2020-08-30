import { join } from "path";

import { Injectable } from "@nestjs/common";

import nodemailer from "nodemailer";
import ejs from "ejs";

import { ConfigService } from "@/config/config.service";
import { Locale } from "@/common/locale.type";

export enum MailTemplate {
  RegisterVerificationCode = "register_verification_code",
  ResetPasswordVerificationCode = "reset_password_verification_code",
  ChangeEmailVerificationCode = "change_email_verification_code"
}

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport(this.configService.config.services.mail.transport);
  }

  private resolveTemplate(template: string, locale: string): string {
    return join(__dirname, "templates", locale, `${template}.ejs`);
  }

  /**
   * Send a template mail to a email address.
   *
   * @param template The template mail name
   * @param data The data to pass to the template
   * @param recipient The recipient email address
   * @returns The error message. Falsy on success.
   */
  async sendMail(
    template: MailTemplate,
    locale: Locale,
    data: Record<string, unknown>,
    recipient: string
  ): Promise<string> {
    const renderResult = (
      await ejs.renderFile(this.resolveTemplate(template, locale), {
        ...data,
        siteName: this.configService.config.preference.siteName
      })
    ).trim();

    const [subject, ...contentLines] = renderResult.split("\n");
    const content = contentLines.join("\n");

    try {
      await this.transporter.sendMail({
        from: `${this.configService.config.preference.siteName} <${this.configService.config.services.mail.address}>`,
        to: recipient,
        subject,
        html: content
      });
      return null;
    } catch (e) {
      return String(e);
    }
  }
}
