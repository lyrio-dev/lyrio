import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { FileEntity } from "./file.entity";
import { FileUploadEntity } from "./file-upload.entity";
import { FileDeleteEntity } from "./file-delete.entity";
import { FileService } from "./file.service";
import { FileController } from "./file.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    TypeOrmModule.forFeature([FileUploadEntity]),
    TypeOrmModule.forFeature([FileDeleteEntity]),
    ConfigModule
  ],
  providers: [FileService],
  controllers: [FileController],
  exports: [FileService]
})
export class FileModule {}
