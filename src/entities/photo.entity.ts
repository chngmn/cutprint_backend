// src/photo/photo.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { PhotoSession } from './photo-session.entity'; // PhotoSession 엔티티 import
import { User } from './user.entity'; // User 엔티티 import

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  session_id: number; // 외래 키 (FK) 컬럼

  @Column({ type: 'integer' })
  contributor_id: number; // 외래 키 (FK) 컬럼

  @Column({ type: 'text' })
  url: string;

  @CreateDateColumn({ type: 'timestamptz' })
  taken_at: Date;

  // 관계 정의
  @ManyToOne(() => PhotoSession, photoSession => photoSession.photos)
  session: PhotoSession;

  @ManyToOne(() => User, user => user.contributedPhotos)
  contributor: User;
}