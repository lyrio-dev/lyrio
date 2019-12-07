import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LocalizedContentService } from "./localized-content.service";
import { LocalizedContentEntity } from "./localized-content.entity";

@Module({
  imports: [TypeOrmModule.forFeature([LocalizedContentEntity])],
  providers: [LocalizedContentService],
  exports: [LocalizedContentService]
})
export class LocalizedContentModule {}
