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

  @Column({ type: "text" })
  bio: string;

  @Column({ type: "boolean" })
  isAdmin: boolean;

  @Column({ type: "integer" })
  acceptedProblemCount: number;

  @Column({ type: "integer" })
  submissionCount: number;

  @Column({ type: "integer" })
  rating: number;

  @OneToOne(
    type => UserAuthEntity,
    userAuth => userAuth.user
  )
  userAuth: Promise<UserAuthEntity>;
}
