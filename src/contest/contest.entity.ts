import { Column, Entity, Index, OneToOne, PrimaryGeneratedColumn } from "typeorm";

import { Locale } from "@/common/locale.type";
import { ContestConfigEntity } from "./contest-config.entity";

export enum ContestType {
  Basic = "Basic",
  ICPC = "ICPC"
}

export enum ContestPublicness {
  PublicParticipation = "PublicParticipation",
  PublicViewAfterEnded = "PublicViewAfterEnded",
  Hidden = "Hidden"
}

@Entity("contest")
@Index(["startTime", "endTime"])
@Index(["publicness", "startTime", "endTime"])
export class ContestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: ContestType })
  type: ContestType;

  @Column({ type: "datetime" })
  @Index()
  startTime: Date;

  @Column({ type: "datetime" })
  @Index()
  endTime: Date;

  @Column({ type: "integer", nullable: true })
  participantDuration: number;

  @Column({ type: "enum", enum: ContestPublicness })
  @Index()
  publicness: ContestPublicness;

  // The first of the array is its default locale
  @Column({ type: "json" })
  locales: Locale[];

  @OneToOne(() => ContestConfigEntity, contestConfig => contestConfig.contest)
  contestConfig: Promise<ContestConfigEntity>;
}
