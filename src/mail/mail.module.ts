import { Module, forwardRef } from "@nestjs/common";

import { ConfigModule } from "@/config/config.module";
import { MailService } from "./mail.service";

@Module({
  imports: [forwardRef(() => ConfigModule)],
  providers: [MailService],
  exports: [MailService]
})
export class MailModule {}
