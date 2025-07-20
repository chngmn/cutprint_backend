// src/photo-session/photo-session.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from './user.entity'; // User 엔티티 import
import { SessionInvite } from './session-invite.entity';
import { Photo } from './photo.entity';

@Entity('photo_sessions')
export class PhotoSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  creator_id: number; // 외래 키 (FK) 컬럼

  @Column({ type: 'varchar' })
  type: string; // 예: 'public', 'private', 'group'

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // 관계 정의
  @ManyToOne(() => User, user => user.createdPhotoSessions)
  creator: User;

  @OneToMany(() => SessionInvite, sessionInvite => sessionInvite.session)
  sessionInvites: SessionInvite[];

  @OneToMany(() => Photo, photo => photo.session)
  photos: Photo[];
}