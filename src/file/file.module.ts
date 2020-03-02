import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { FileEntity } from "./file.entity";
import { FileService } from "./file.service";

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), ConfigModule],
  providers: [FileService],
  exports: [FileService]
})
export class FileModule {}
