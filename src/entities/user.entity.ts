// src/user/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Friendship } from './friendship.entity';
import { PhotoSession } from './photo-session.entity';
import { SessionInvite } from './session-invite.entity';
import { Photo } from './photo.entity';
import { Notification } from './notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password_hash: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  google_id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  auth_provider: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  nickname: string;

  @Column({ type: 'text', nullable: true })
  profile_image_url: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // 관계 정의
  @OneToMany(() => Friendship, friendship => friendship.requester)
  requestedFriendships: Friendship[];

  @OneToMany(() => Friendship, friendship => friendship.receiver)
  receivedFriendships: Friendship[];

  @OneToMany(() => PhotoSession, photoSession => photoSession.creator)
  createdPhotoSessions: PhotoSession[];

  @OneToMany(() => SessionInvite, sessionInvite => sessionInvite.invitedUser)
  sessionInvites: SessionInvite[];

  @OneToMany(() => Photo, photo => photo.contributor)
  contributedPhotos: Photo[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];
}