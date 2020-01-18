import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("file_delete")
export class FileDeleteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // I believe there's not so much overhead using text UUIDs
  @Column({ type: "char", length: 36 })
  @Index({ unique: true })
  uuid: string;
}
