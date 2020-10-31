import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("settings")
export class SettingsEntity {
  @PrimaryColumn({ type: "varchar", length: 30 })
  key: string;

  @Column({ type: "json" })
  value: unknown;
}
