import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import FileCompressionType from "./file-compression-type.enum";

@Entity("file_upload")
export class FileUploadEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // I believe there's not so much overhead using text UUIDs
  @Column({ type: "char", length: 36 })
  @Index({ unique: true })
  uuid: string;

  @Column({ type: "char", length: 64 })
  sha256: string;

  @Column({ type: "enum", enum: FileCompressionType })
  compressionType: FileCompressionType;

  @Column({ type: "datetime" })
  expireTime: Date;
}
