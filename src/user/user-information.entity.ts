import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { UserEntity } from "./user.entity";

@Entity("user_information")
export class UserInformationEntity {
  @OneToOne(() => UserEntity)
  @JoinColumn()
  user: Promise<UserEntity>;

  @PrimaryColumn()
  userId: number;

  @Column({ type: "varchar", length: 80 })
  organization: string;

  @Column({ type: "varchar", length: 80 })
  location: string;

  @Column({ type: "varchar", length: 80 })
  url: string;

  @Column({ type: "varchar", length: 30 })
  telegram: string;

  @Column({ type: "varchar", length: 30 })
  qq: string;

  @Column({ type: "varchar", length: 30 })
  github: string;
}
