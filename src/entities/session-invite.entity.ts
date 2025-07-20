// src/session-invite/session-invite.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { PhotoSession } from './photo-session.entity'; // PhotoSession 엔티티 import
import { User } from './user.entity'; // User 엔티티 import

@Entity('session_invites')
export class SessionInvite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  session_id: number; // 외래 키 (FK) 컬럼

  @Column({ type: 'integer' })
  invited_user_id: number; // 외래 키 (FK) 컬럼

  @Column({ type: 'varchar' })
  status: string; // 예: 'pending', 'accepted', 'declined'

  @CreateDateColumn({ type: 'timestamptz' })
  invited_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  responded_at: Date;

  // 관계 정의
  @ManyToOne(() => PhotoSession, photoSession => photoSession.sessionInvites)
  session: PhotoSession;

  @ManyToOne(() => User, user => user.sessionInvites)
  invitedUser: User;
}