import { Entity, ManyToOne, Column, JoinColumn, Index, PrimaryGeneratedColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

export enum AuditLogObjectType {
  User = "User",
  Group = "Group",
  Problem = "Problem",
  ProblemTag = "ProblemTag",
  Submission = "Submission",
  Discussion = "Discussion",
  DiscussionReply = "DiscussionReply"
}

@Entity("audit_log")
export class AuditLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  user: Promise<UserEntity>;

  @Column()
  @Index()
  userId: number;

  /**
   * The maximum length of IP address is 45: XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:AAA.BBB.CCC.DDD
   */
  @Column({ type: "varchar", length: 45 })
  @Index()
  ip: string;

  @Column({ type: "datetime" })
  @Index()
  time: Date;

  @Column({ type: "varchar", length: 40 })
  @Index()
  action: string;

  @Column({ type: "enum", enum: AuditLogObjectType, nullable: true })
  firstObjectType?: AuditLogObjectType;

  @Column({ type: "integer", nullable: true })
  @Index()
  firstObjectId?: number;

  /**
   * Sometimes there're two object IDs in an action. e.g. add user to group
   */
  @Column({ type: "enum", enum: AuditLogObjectType, nullable: true })
  secondObjectType?: AuditLogObjectType;

  @Column({ type: "integer", nullable: true })
  @Index()
  secondObjectId?: number;

  /**
   * Some details to describe the event
   */
  @Column({ type: "json", nullable: true })
  details?: unknown;
}
