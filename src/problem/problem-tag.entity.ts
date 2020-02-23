import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

import { Locale } from "@/common/locale.type";

@Entity("problem_tag")
export class ProblemTagEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 20 })
  color: string;

  @Column({ type: "json" })
  locales: Locale[];
}
