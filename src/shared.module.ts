import { Module, Global } from "@nestjs/common";

import { Request } from "express"; // eslint-disable-line import/no-extraneous-dependencies
import { GoogleRecaptchaModule } from "@nestlab/google-recaptcha";

import { ConfigModule } from "./config/config.module";
import { ConfigService } from "./config/config.service";
import { SettingsModule } from "./settings/settings.module";

const sharedModules = [
  ConfigModule,
  SettingsModule,
  GoogleRecaptchaModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      secretKey: configService.config.security.recaptcha.secretKey,
      response: (req: Request) => String(req.headers["x-recaptcha-token"]),
      skipIf: () => !configService.config.security.recaptcha.secretKey
    }),
    inject: [ConfigService]
  })
];

@Global()
@Module({
  imports: sharedModules,
  exports: sharedModules
})
export class SharedModule {}
