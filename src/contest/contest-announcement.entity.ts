import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

import { ContestEntity } from "./contest.entity";

import { ContestAnnouncementLocalizedContentDto } from "./dto/contest-announcement-localized-content.dto";

@Entity("contest_announcement")
@Index(["contestId", "publishTime"])
export class ContestAnnouncementEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ContestEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  contest: Promise<ContestEntity>;

  @Column()
  contestId: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  publisher: Promise<UserEntity>;

  @Column()
  publisherId: number;

  @Column({ type: "datetime" })
  publishTime: Date;

  // We do NOT use LocalizedContentService since that makes push a lot harder
  @Column({ type: "json" })
  localizedContents: ContestAnnouncementLocalizedContentDto[];
}
