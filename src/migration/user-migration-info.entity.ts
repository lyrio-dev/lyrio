import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

@Entity("user_migration_info")
export class UserMigrationInfoEntity {
  @OneToOne(() => UserEntity, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  user: Promise<UserEntity>;

  @PrimaryColumn()
  userId: number;

  @Column({ type: "varchar", length: 80 })
  oldUsername: string;

  @Column({ type: "varchar", length: 120 })
  oldEmail: string;

  /**
   * `bcrypt(md5(password + "syzoj2_xxx"))`
   */
  @Column({ type: "char", length: 60 })
  oldPasswordHashBcrypt: string;

  @Column({ type: "boolean" })
  usernameMustChange: boolean;

  @Column({ type: "boolean" })
  migrated: boolean;
}
