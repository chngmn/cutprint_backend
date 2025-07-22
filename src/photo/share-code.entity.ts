// src/photo/share-code.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Photo } from '../entities/photo.entity';

@Entity('photo_share_codes')
@Index(['shareCode'], { unique: true })
export class PhotoShareCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 12, unique: true })
  shareCode: string; // 12자리 공유 코드

  @Column({ type: 'integer' })
  photoId: number; // 외래 키 (FK) 컬럼: 공유되는 사진 ID

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date; // 선택적: 공유 링크 만료일

  @Column({ type: 'integer', default: 0 })
  viewCount: number; // 조회수

  // 관계 정의
  @ManyToOne(() => Photo)
  photo: Photo;
}
