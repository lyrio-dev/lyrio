import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { FileEntity } from "./file.entity";
import { FileService } from "./file.service";

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity])],
  providers: [FileService],
  exports: [FileService]
})
export class FileModule {}
