import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SettingsEntity } from "./settings.entity";
import { SettingsService } from "./settings.service";

@Module({
  imports: [TypeOrmModule.forFeature([SettingsEntity])],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule {}
