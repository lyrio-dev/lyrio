import { Entity, PrimaryColumn, Column, Index } from "typeorm";
import { Locale } from "@/common/locale.type";

export enum LocalizedContentType {
  PROBLEM_TITLE = "PROBLEM_TITLE",
  PROBLEM_CONTENT = "PROBLEM_CONTENT",
  PROBLEM_TAG_NAME = "PROBLEM_TAG_NAME"
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
