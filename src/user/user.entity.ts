import { Entity, PrimaryGeneratedColumn, Column, OneToOne, Index } from "typeorm";

import { UserAuthEntity } from "@/auth/user-auth.entity";

@Entity("user")
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 24 })
  @Index({ unique: true })
  username: string;

  @Column({ type: "varchar", length: 255 })
  @Index({ unique: true })
  email: string;

  @Column({ type: "varchar", length: 24 })
  nickname: string;

  @Column({ type: "varchar", length: 160 })
  bio: string;

  /**
   * gravatar:email_address ("email_address" can be empty, meaning using the "email" field's value)
   * github:github_username
   * qq:qq_uin
   *
   * This field will NOT be directly send to client, and should be processed.
   * e.g. Gravatar email address should be hashed for privacy
   */
  @Column({ type: "varchar", length: 50 })
  avatarInfo: string;

  @Column({ type: "boolean" })
  isAdmin: boolean;

  @Column({ type: "integer" })
  acceptedProblemCount: number;

  @Column({ type: "integer" })
  submissionCount: number;

  @Column({ type: "integer" })
  rating: number;

  @Column({ type: "boolean" })
  publicEmail: boolean;

  @Column({ type: "datetime", nullable: true })
  registrationTime: Date;

  @OneToOne(() => UserAuthEntity, userAuth => userAuth.user)
  userAuth: Promise<UserAuthEntity>;
}
