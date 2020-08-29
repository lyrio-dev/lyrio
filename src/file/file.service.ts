import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection, EntityManager, In } from "typeorm";
import Minio = require("minio");
import { v4 as UUID } from "uuid";

import { ConfigService } from "@/config/config.service";
import { FileEntity } from "./file.entity";
import { FileUploadInfoDto } from "./dto";

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
const FILE_UPLOAD_EXPIRE_TIME = 10 * 60;
// 20 minutes download expire time
const FILE_DOWNLOAD_EXPIRE_TIME = 20 * 60 * 60;

@Injectable()
export class FileService implements OnModuleInit {
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly configService: ConfigService
  ) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.config.services.minio.endPoint,
      port: this.configService.config.services.minio.port,
      useSSL: this.configService.config.services.minio.useSSL,
      accessKey: this.configService.config.services.minio.accessKey,
      secretKey: this.configService.config.services.minio.secretKey
    });
    this.bucket = this.configService.config.services.minio.bucket;
  }

  async onModuleInit(): Promise<void> {
    let bucketExists: boolean;
    try {
      bucketExists = await this.minioClient.bucketExists(this.bucket);
    } catch (e) {
      throw new Error(
        `Error initializing the MinIO client. Please check your configuration file and MinIO server. ${e}`
      );
    }

    if (!bucketExists)
      throw new Error(
        `MinIO bucket ${this.bucket} doesn't exist. Please check your configuration file and MinIO server.`
      );
  }

  async signUploadRequest(minSize?: number, maxSize?: number): Promise<FileUploadInfoDto> {
    const uuid = UUID();
    const policy = this.minioClient.newPostPolicy();
    policy.setBucket(this.bucket);
    policy.setKey(uuid);
    policy.setExpires(new Date(Date.now() + FILE_UPLOAD_EXPIRE_TIME * 1000));
    if (minSize != null || maxSize != null) {
      policy.setContentLengthRange(minSize || 0, maxSize || 0);
    }
    const policyResult = await this.minioClient.presignedPostPolicy(policy);

    return {
      uuid: uuid,
      method: "POST",
      url: policyResult.postURL,
      extraFormData: policyResult.formData,
      fileFieldName: "file"
    };
  }

  /**
   * @return error
   */
  async finishUpload(
    uuid: string,
    transactionalEntityManager: EntityManager
  ): Promise<"INVALID_OPERATION" | "NOT_UPLOADED"> {
    // If the file has already uploaded and finished
    if ((await this.fileRepository.count({ uuid: uuid })) != 0) return "INVALID_OPERATION";

    // Get file size
    let size: number;
    try {
      const stat = await this.minioClient.statObject(this.bucket, uuid);
      size = stat.size;
    } catch (e) {
      if (e.message === "The specified key does not exist.") {
        return "NOT_UPLOADED";
      } else throw e;
    }

    const file = new FileEntity();
    file.uuid = uuid;
    file.size = size;
    file.uploadTime = new Date();

    await transactionalEntityManager.save(FileEntity, file);

    return null;
  }

  /**
   * @return A function to run after transaction, to delete the file(s) actually.
   */
  async deleteFile(uuid: string | string[], transactionalEntityManager: EntityManager): Promise<() => void> {
    if (typeof uuid === "string") {
      await transactionalEntityManager.delete(FileEntity, { uuid: uuid });
      return () =>
        this.minioClient.removeObject(this.bucket, uuid).catch(e => {
          Logger.error(`Failed to delete file ${uuid}: ${e}`);
        });
    } else if (uuid.length > 0) {
      await transactionalEntityManager.delete(FileEntity, { uuid: In(uuid) });
      return () =>
        this.minioClient.removeObjects(this.bucket, uuid).catch(e => {
          Logger.error(`Failed to delete file [${uuid}]: ${e}`);
        });
    }
  }

  /**
   * Delete a user-uploaded file before calling finishUpload()
   */
  deleteUnfinishedUploadedFile(uuid: string): void {
    this.minioClient.removeObject(this.bucket, uuid).catch(e => {
      if (e.message === "The specified key does not exist.") return;
      Logger.error(`Failed to delete unfinished uploaded file ${uuid}: ${e}`);
    });
  }

  async getFileSizes(uuids: string[]): Promise<number[]> {
    if (uuids.length === 0) return [];
    const uniqueUuids = Array.from(new Set(uuids));
    const files = await this.fileRepository.find({
      uuid: In(uniqueUuids)
    });
    const map = Object.fromEntries(files.map(file => [file.uuid, file]));
    return uuids.map(uuid => map[uuid].size);
  }

  async getDownloadLink(uuid: string, filename?: string, noExpire?: boolean): Promise<string> {
    return await this.minioClient.presignedGetObject(
      this.bucket,
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

  async runMaintainceTasks(): Promise<void> {
    // Delete unused files
    // TODO: Use listObjectsV2 instead, which returns at most 1000 objects in a time
    const stream = this.minioClient.listObjects(this.bucket),
      deleteList: string[] = [];
    await new Promise((resolve, reject) => {
      const promises: Promise<void>[] = [];
      stream.on("data", object => {
        promises.push(
          (async () => {
            const uuid = object.name;
            if (!(await this.fileRepository.count({ uuid: uuid }))) {
              deleteList.push(uuid);
            }
          })()
        );
      });
      stream.on("end", () => Promise.all(promises).then(resolve).catch(reject));
      stream.on("error", reject);
    });
    await this.minioClient.removeObjects(this.bucket, deleteList);
  }
}
