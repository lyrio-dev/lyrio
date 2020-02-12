import { Injectable, Inject, OnModuleInit } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection, EntityManager } from "typeorm";
import * as Minio from "minio";
import * as UUID from "uuid/v4";
import * as crypto from "crypto";

import { ConfigService } from "@/config/config.service";

import { FileEntity } from "./file.entity";
import { FileUploadEntity } from "./file-upload.entity";
import { FileDeleteEntity } from "./file-delete.entity";
import FileCompressionType from "./file-compression-type.enum";
import { Stream } from "stream";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function encodeRFC5987ValueChars(str: string) {
  return (
    encodeURIComponent(str)
      // Note that although RFC3986 reserves "!", RFC5987 does not,
      // so we do not need to escape it
      .replace(/['()]/g, escape) // i.e., %27 %28 %29
      .replace(/\*/g, "%2A")
      // The following are not required for percent-encoding per RFC5987,
      // so we can allow for a little better readability over the wire: |`^
      .replace(/%(?:7C|60|5E)/g, unescape)
  );
}

// 10 minutes upload expire time
const FILE_UPLOAD_EXPIRE_TIME = 60 * 10;
// 1 hour downlaod expire time
const FILE_DOWNLOAD_EXPIRE_TIME = 1 * 60 * 60;

// TODO: Setup delayed tasks to clear expired file_upload records
// TODO: Setup delayed tasks to delete files
// TODO: Add upload file size limit
@Injectable()
export class FileService implements OnModuleInit {
  private readonly minioClient: Minio.Client;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(FileUploadEntity)
    private readonly fileUploadRepository: Repository<FileUploadEntity>,
    @InjectRepository(FileDeleteEntity)
    private readonly fileDeleteRepository: Repository<FileDeleteEntity>,
    private readonly configService: ConfigService
  ) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.config.services.minio.endPoint,
      port: this.configService.config.services.minio.port,
      useSSL: this.configService.config.services.minio.useSSL,
      accessKey: this.configService.config.services.minio.accessKey,
      secretKey: this.configService.config.services.minio.secretKey
    });
  }

  async onModuleInit(): Promise<void> {
    let bucketExists: boolean;
    try {
      bucketExists = await this.minioClient.bucketExists(this.configService.config.services.minio.bucket);
    } catch (e) {
      throw new Error(
        `Error initializing the MinIO client. Please check your configuration file and MinIO server. ${e}`
      );
    }

    if (!bucketExists)
      throw new Error(
        `MinIO bucket ${this.configService.config.services.minio.bucket} doesn't exist. Please check your configuration file and MinIO server.`
      );
  }

  async tryReferenceFile(sha256: string, transactionalEntityManager: EntityManager): Promise<string> {
    const file = await transactionalEntityManager.findOne(FileEntity, { sha256: sha256 });
    if (!file) return null;

    await transactionalEntityManager.increment(FileEntity, { id: file.id }, "referenceCount", 1);
    return file.uuid;
  }

  async dereferenceFile(uuid: string, transactionalEntityManager: EntityManager): Promise<void> {
    await transactionalEntityManager.decrement(FileEntity, { uuid: uuid }, "referenceCount", 1);

    const file = await transactionalEntityManager.findOne(FileEntity, { uuid: uuid });

    if (file.referenceCount === 0) {
      const fileDelete = new FileDeleteEntity();
      fileDelete.uuid = file.uuid;

      await transactionalEntityManager.save(FileDeleteEntity, fileDelete);
      await transactionalEntityManager.remove(FileEntity, file);

      // Here we can't do the deletion since the transaction is not committed.
    }
  }

  // [uuid, uploadUrl]
  async createUploadUrl(sha256: string, transactionalEntityManager?: EntityManager): Promise<[string, string]> {
    const uuid = UUID();
    const url = await this.minioClient.presignedPutObject(
      this.configService.config.services.minio.bucket,
      uuid,
      FILE_UPLOAD_EXPIRE_TIME
    );

    const fileUpload = new FileUploadEntity();
    fileUpload.uuid = uuid;
    fileUpload.sha256 = sha256;
    fileUpload.compressionType = FileCompressionType.None;
    fileUpload.expireTime = new Date(Date.now() + FILE_UPLOAD_EXPIRE_TIME * 1000);
    if (transactionalEntityManager) await transactionalEntityManager.save(FileUploadEntity, fileUpload);
    else await this.fileUploadRepository.save(fileUpload);

    return [uuid, url];
  }

  // [error, uuid]
  async finishUpload(
    uuid: string
  ): Promise<["INVALID_OPERATION" | "NOT_UPLOADED" | "IO_ERROR" | "CHECKSUM_MISMATCH", string]> {
    return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const fileUpload = await transactionalEntityManager.findOne(FileUploadEntity, { uuid: uuid });
      if (!fileUpload) return ["INVALID_OPERATION", null];

      // Get file stream
      let fileStream: Stream;
      try {
        fileStream = await this.minioClient.getObject(this.configService.config.services.minio.bucket, uuid);
      } catch (e) {
        if (e.message === "The specified key does not exist.") {
          return ["NOT_UPLOADED", null];
        } else throw e;
      }

      // Calcluate size
      let fileSize = 0;
      fileStream.on("data", chunk => (fileSize += chunk.length));

      // Calculate SHA256 hash
      const hash = crypto.createHash("sha256");
      fileStream.pipe(hash);
      let sha256: string;
      try {
        sha256 = await new Promise((resolve, reject) => {
          hash.once("readable", () => {
            resolve(hash.digest("hex"));
          });

          fileStream.once("error", reject);
        });
      } catch (e) {
        return ["IO_ERROR", null];
      }

      if (fileUpload.sha256 !== sha256) return ["CHECKSUM_MISMATCH", null];

      // Check if another user has uploaded a file with the same hash
      if ((await this.fileRepository.count({ sha256: sha256 })) != 0) {
        // Delete the uploading file and use that one
        const fileDelete = new FileDeleteEntity();
        fileDelete.uuid = uuid;
        await transactionalEntityManager.save(FileDeleteEntity, fileDelete);
        await transactionalEntityManager.remove(FileUploadEntity, fileUpload);

        const file = await this.fileRepository.findOne({ sha256: sha256 });
        return [null, file.uuid];
      }

      const file = new FileEntity();
      file.uuid = fileUpload.uuid;
      file.sha256 = sha256;
      file.compressionType = fileUpload.compressionType;
      file.size = fileSize;
      file.uploadTime = new Date();
      file.referenceCount = 0;

      await transactionalEntityManager.save(FileEntity, file);
      await transactionalEntityManager.remove(FileUploadEntity, fileUpload);

      return [null, file.uuid];
    });
  }

  async getFileSizes(uuids: string[]): Promise<number[]> {
    return Promise.all(
      uuids.map(
        async uuid =>
          (
            await this.fileRepository.findOne({
              uuid: uuid
            })
          ).size
      )
    );
  }

  async getDownloadLink(uuid: string, filename?: string, noExpire?: boolean): Promise<string> {
    return await this.minioClient.presignedGetObject(
      this.configService.config.services.minio.bucket,
      uuid,
      // The maximum expire time is 7 days
      noExpire ? 24 * 60 * 60 * 7 : FILE_DOWNLOAD_EXPIRE_TIME,
      !filename
        ? {}
        : {
            "response-content-disposition": 'attachment; filename="' + encodeRFC5987ValueChars(filename) + '"'
          }
    );
  }
}
