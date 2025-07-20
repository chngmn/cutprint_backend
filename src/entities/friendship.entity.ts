// src/friendship/friendship.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
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

  // 관계 정의
  @ManyToOne(() => User, user => user.requestedFriendships)
  requester: User;

  @ManyToOne(() => User, user => user.receivedFriendships)
  receiver: User;
}