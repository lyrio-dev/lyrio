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

  @Column({ type: "varchar", length: 160 })
  bio: string;

  @Column({ type: "boolean", nullable: true })
  sexIsFamale: boolean;

  @Column({ type: "varchar", length: 80 })
  organization: string;

  @Column({ type: "varchar", length: 80 })
  location: string;

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

  @Column({ type: "datetime" })
  registrationTime: Date;

  @OneToOne(
    type => UserAuthEntity,
    userAuth => userAuth.user
  )
  userAuth: Promise<UserAuthEntity>;
}
