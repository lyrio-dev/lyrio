import { Entity, PrimaryGeneratedColumn, Index, Column } from "typeorm";

@Entity("group")
export class GroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 48 })
  @Index({ unique: true })
  name: string;

  @Column({ type: "integer" })
  memberCount: number;
}
