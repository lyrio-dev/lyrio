import { Entity, PrimaryColumn, Column, Index } from "typeorm";

import { Locale } from "@/common/locale.type";

export enum LocalizedContentType {
  ProblemTitle = "ProblemTitle",
  ProblemContent = "ProblemContent",
  ProblemTagName = "ProblemTagName"
}

@Entity("localized_content")
@Index(["objectId", "type"])
export class LocalizedContentEntity {
  @PrimaryColumn({ type: "integer" })
  objectId: number;

  @PrimaryColumn({ type: "enum", enum: LocalizedContentType })
  type: LocalizedContentType;

  @PrimaryColumn({ type: "enum", enum: Locale })
  locale: Locale;

  @Column({ type: "mediumtext" })
  data: string;
}
