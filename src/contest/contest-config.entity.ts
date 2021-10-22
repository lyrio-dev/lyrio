import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";

import { ContestEntity } from "./contest.entity";
import { ContestOptions } from "./contest-options.interface";

@Entity("contest_config")
export class ContestConfigEntity<ContestTypeOptions = unknown> {
  @OneToOne(() => ContestEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  contest: Promise<ContestEntity>;

  @PrimaryColumn()
  contestId: number;

  @Column({ type: "json" })
  contestOptions: ContestOptions;

  @Column({ type: "json" })
  contestTypeOptions: ContestTypeOptions;
}
