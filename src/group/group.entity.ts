import { Entity, PrimaryGeneratedColumn, Index, ManyToOne, Column, JoinColumn } from "typeorm";

import { UserEntity } from "@/user/user.entity";

@Entity("group")
export class GroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 48 })
  @Index({ unique: true })
  name: string;

  @ManyToOne(type => UserEntity)
  @JoinColumn()
  owner: Promise<UserEntity>;

  @Column()
  ownerId: number;
}
