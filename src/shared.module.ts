import { Module, Global } from "@nestjs/common";

import { Request } from "express"; // eslint-disable-line import/no-extraneous-dependencies
import { GoogleRecaptchaModule } from "@nestlab/google-recaptcha";

import { ConfigModule } from "./config/config.module";
import { ConfigService } from "./config/config.service";

const sharedModules = [
  ConfigModule,
  GoogleRecaptchaModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      secretKey: configService.config.security.recaptchaSecret,
      response: (req: Request) => String(req.headers["x-recaptcha-token"]),
      skipIf: () => !configService.config.security.recaptchaSecret
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
