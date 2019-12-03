import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { UserEntity } from "./user.entity";

@Entity("user-auth")
export class UserAuthEntity {
  @OneToOne(type => UserEntity)
  @JoinColumn()
  user: Promise<UserEntity>;

  @PrimaryColumn()
  userId: number;

  @Column({ type: "char", length: 60 })
  password: string;
}
