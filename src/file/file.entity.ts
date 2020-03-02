import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("file")
export class FileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // I believe there's not so much overhead using text UUIDs
  @Column({ type: "char", length: 36 })
  @Index({ unique: true })
  uuid: string;

  // The size of the origin file, not the compressed file
  @Column({ type: "integer" })
  size: number;

  @Column({ type: "datetime" })
  uploadTime: Date;
}
