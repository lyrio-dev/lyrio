import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { UserEntity } from "./user.entity";
import { UserPreference } from "./user-preference.interface";

@Entity("user_preference")
export class UserPreferenceEntity {
  @OneToOne(() => UserEntity)
  @JoinColumn()
  user: Promise<UserEntity>;

  @PrimaryColumn()
  userId: number;

  @Column({ type: "json" })
  preference: UserPreference;
}
