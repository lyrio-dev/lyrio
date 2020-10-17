import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

@Entity("user_auth")
export class UserAuthEntity {
  @OneToOne(() => UserEntity)
  @JoinColumn()
  user: Promise<UserEntity>;

  @PrimaryColumn()
  userId: number;

  @Column({ type: "char", length: 60, nullable: true })
  password: string;
}
