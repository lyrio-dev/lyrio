import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";

import { Repository, Connection, EntityManager, In } from "typeorm";
import { v4 as UUID } from "uuid";
import { Client as MinioClient } from "minio";

import { ConfigService } from "@/config/config.service";

import { FileEntity } from "./file.entity";

import { FileUploadInfoDto, SignedFileUploadRequestDto } from "./dto";

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
  private readonly minioClient: MinioClient;

  private readonly bucket: string;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly configService: ConfigService
  ) {
    this.minioClient = new MinioClient({
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

  /**
   * Process the client's request about uploading a file.
   *
   * * If the user has not uploaded the file, return a signed upload info object.
   * * If the user has uploaded the file, check the file existance, file size and limits.
   *
   * @note
   * The `checkLimit` function may return different result for each call with the same upload info.
   *
   * e.g. When a user uploaded other files before upload this file, the quota is enough before uploading but
   *      not enough after uploading.
   *
   * If the file is checked to be exceeding the limit after uploaded, it will be deleted.
   *
   * @return A `SignedFileUploadRequestDto` to return to the client if the file is not uploaded.
   * @return `string` error message if client says the file is uploaded but we do not accept it according to some errors.
   * @return A `FileEntity` if the file is uploaded successfully and saved to the database.
   */
  async processUploadRequest<LimitCheckErrorType extends string>(
    uploadInfo: FileUploadInfoDto,
    checkLimit: (size: number) => Promise<LimitCheckErrorType> | LimitCheckErrorType,
    transactionalEntityManager: EntityManager
  ): Promise<FileEntity | SignedFileUploadRequestDto | LimitCheckErrorType | "FILE_UUID_EXISTS" | "FILE_NOT_UPLOADED"> {
    const limitCheckError = await checkLimit(uploadInfo.size);
    if (limitCheckError) {
      this.deleteUnfinishedUploadedFile(uploadInfo.uuid);
      return limitCheckError;
    }

    if (uploadInfo.uuid) {
      // The client says the file is uploaded

      if ((await transactionalEntityManager.count(FileEntity, { uuid: uploadInfo.uuid })) !== 0)
        return "FILE_UUID_EXISTS";

      // Check file existance
      try {
        await this.minioClient.statObject(this.bucket, uploadInfo.uuid);
      } catch (e) {
        if (e.message === "The specified key does not exist.") {
          return "FILE_NOT_UPLOADED";
        }
        throw e;
      }

      // Save to the database
      const file = new FileEntity();
      file.uuid = uploadInfo.uuid;
      file.size = uploadInfo.size;
      file.uploadTime = new Date();

      await transactionalEntityManager.save(FileEntity, file);

      return file;
    } else {
      // The client says it want to upload a file for this request

      return await this.signUploadRequest(uploadInfo.size, uploadInfo.size);
    }
  }

  private async signUploadRequest(minSize?: number, maxSize?: number): Promise<SignedFileUploadRequestDto> {
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
      uuid,
      method: "POST",
      url: policyResult.postURL,
      extraFormData: policyResult.formData,
      fileFieldName: "file"
    };
  }

  /**
   * @return A function to run after transaction, to delete the file(s) actually.
   */
  async deleteFile(uuid: string | string[], transactionalEntityManager: EntityManager): Promise<() => void> {
    if (typeof uuid === "string") {
      await transactionalEntityManager.delete(FileEntity, { uuid });
      return () =>
        this.minioClient.removeObject(this.bucket, uuid).catch(e => {
          Logger.error(`Failed to delete file ${uuid}: ${e}`);
        });
    }
    if (uuid.length > 0) {
      await transactionalEntityManager.delete(FileEntity, { uuid: In(uuid) });
      return () =>
        this.minioClient.removeObjects(this.bucket, uuid).catch(e => {
          Logger.error(`Failed to delete file [${uuid}]: ${e}`);
        });
    }
    return () => {
      /* do nothing */
    };
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
            "response-content-disposition": `attachment; filename="${encodeRFC5987ValueChars(filename)}"`
          }
    );
  }

  async runMaintainceTasks(): Promise<void> {
    // Delete unused files
    // TODO: Use listObjectsV2 instead, which returns at most 1000 objects in a time
    const stream = this.minioClient.listObjects(this.bucket);
    const deleteList: string[] = [];
    await new Promise((resolve, reject) => {
      const promises: Promise<void>[] = [];
      stream.on("data", object => {
        promises.push(
          (async () => {
            const uuid = object.name;
            if (!(await this.fileRepository.count({ uuid }))) {
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
