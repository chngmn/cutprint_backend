// src/friendship/friendship.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity'; // User 엔티티 import

@Entity('friendships')
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  requester_id: number; // 외래 키 (FK) 컬럼

  @Column({ type: 'integer' })
  receiver_id: number; // 외래 키 (FK) 컬럼

  @Column({ type: 'varchar' })
  status: string; // 예: 'pending', 'accepted', 'rejected'

  @CreateDateColumn({ type: 'timestamptz' })
  requested_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  responded_at: Date;

  @Column({ type: 'boolean', default: false })
  requester_close_friend: boolean; // 요청자가 받는자를 친한 친구로 지정했는지

  @Column({ type: 'boolean', default: false })
  receiver_close_friend: boolean; // 받는자가 요청자를 친한 친구로 지정했는지

  // 관계 정의
  @ManyToOne(() => User, (user) => user.requestedFriendships)
  requester: User;

  @ManyToOne(() => User, (user) => user.receivedFriendships)
  receiver: User;
}
