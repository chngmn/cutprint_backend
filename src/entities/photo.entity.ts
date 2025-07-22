// src/photo/photo.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity'; // User 엔티티 import

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  // 'contributor_id' 대신 'creator_id'로 변경하여 이 사진을 만든 사용자임을 명확히 합니다.
  @Column({ type: 'integer' })
  creator_id: number; // 외래 키 (FK) 컬럼: 이 네 컷 사진을 만든 사용자 ID

  @Column({ type: 'text' })
  url: string; // S3에 저장된 완성된 네 컷 사진 이미지의 URL

  @Column({ type: 'text', nullable: true })
  s3_key?: string; // S3 객체 키 (삭제 시 필요)

  @Column({
    type: 'enum',
    enum: ['PRIVATE', 'CLOSE_FRIENDS', 'ALL_FRIENDS'],
    default: 'ALL_FRIENDS',
  })
  visibility: 'PRIVATE' | 'CLOSE_FRIENDS' | 'ALL_FRIENDS'; // 사진 공개 범위

  // 'taken_at' 대신 'created_at'으로 변경하여 사진이 생성된 시점을 나타냅니다.
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // 관계 정의
  // 'PhotoSession'과의 관계가 사라지고, 'User'와 직접 관계를 맺습니다.
  // User 엔티티에는 'createdPhotos'와 같은 역관계 필드가 필요합니다.
  @ManyToOne(() => User, (user) => user.createdPhotos)
  creator: User;
}
