import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import FileCompressionType from "./file-compression-type.enum";

@Entity("file")
export class FileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // I believe there's not so much overhead using text UUIDs
  @Column({ type: "char", length: 36 })
  @Index({ unique: true })
  uuid: string;

  // The sha256 checksum of the origin file, not the compressed file
  @Column({ type: "char", length: 64 })
  @Index({ unique: true })
  sha256: string;

  @Column({ type: "enum", enum: FileCompressionType })
  compressionType: FileCompressionType;

  // The size of the origin file, not the compressed file
  @Column({ type: "integer" })
  size: number;

  @Column({ type: "datetime" })
  uploadTime: Date;

  // referenceCount: How many files of this file's copy are existing in this system?
  // A file's referenceCount decreases when user requests to delete it (from a reference)
  // If it decrease to 0 when deleting, delete it actually
  // Initially it's 0 and should be referenced quickly, otherwise the system may delete it in a delayed task
  @Column({ type: "integer" })
  referenceCount: number;
}
