import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from '../entities/photo.entity';
import { S3Service } from '../s3/s3.service';
import { Readable } from 'stream';
import { NotificationService } from '../notification/notification.service';
import { User } from '../entities/user.entity';
import { Friendship } from '../entities/friendship.entity';

export interface CreatePhotoDto {
  creator_id: number;
  visibility?: 'PRIVATE' | 'CLOSE_FRIENDS' | 'ALL_FRIENDS';
}

@Injectable()
export class PhotoService {
  private readonly logger = new Logger(PhotoService.name);

  constructor(
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    private s3Service: S3Service,
    private notificationService: NotificationService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
  ) {}

  async uploadPhoto(
    file: Express.Multer.File,
    createPhotoDto: CreatePhotoDto,
  ): Promise<Photo> {
    try {
      // Upload file to S3
      const s3Url = await this.s3Service.uploadFile(file, 'photos');

      // Extract S3 key from URL for future deletion
      const url = new URL(s3Url);
      const s3Key = url.pathname.substring(1); // Remove leading slash

      // Save photo metadata to database
      const photo = this.photoRepository.create({
        creator_id: createPhotoDto.creator_id,
        url: s3Url,
        s3_key: s3Key,
        visibility: createPhotoDto.visibility || 'ALL_FRIENDS',
      });

      const savedPhoto = await this.photoRepository.save(photo);
      this.logger.log(`Photo saved successfully with ID: ${savedPhoto.id}`);

      return savedPhoto;
    } catch (error) {
      this.logger.error('Error uploading photo:', error);
      throw new Error('Failed to upload photo');
    }
  }

  async getPhotoById(id: number): Promise<Photo> {
    const photo = await this.photoRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    return photo;
  }

  async getPhotosByUserId(userId: number, viewerId?: number): Promise<Photo[]> {
    console.log('user id', userId);

    const allPhotos = await this.photoRepository.find({
      where: { creator_id: userId },
      relations: ['creator'],
      order: { created_at: 'DESC' },
    });

    // If viewerId is not provided or viewer is the owner, return all photos
    if (!viewerId || viewerId === userId) {
      return allPhotos;
    }

    // Filter photos based on visibility and friendship
    const visiblePhotos: Photo[] = [];

    for (const photo of allPhotos) {
      if (await this.canViewPhoto(photo, viewerId)) {
        visiblePhotos.push(photo);
      }
    }

    return visiblePhotos;
  }

  async getAllPhotos(): Promise<Photo[]> {
    return this.photoRepository.find({
      relations: ['creator'],
      order: { created_at: 'DESC' },
    });
  }

  async deletePhoto(id: number, userId: number): Promise<void> {
    const photo = await this.photoRepository.findOne({
      where: { id, creator_id: userId },
    });

    if (!photo) {
      throw new NotFoundException(
        `Photo with ID ${id} not found or you don't have permission to delete it`,
      );
    }

    try {
      // Delete from S3
      if (photo.s3_key) {
        await this.s3Service.deleteFile(photo.url);
      }

      // Delete from database
      await this.photoRepository.remove(photo);
      this.logger.log(`Photo with ID ${id} deleted successfully`);
    } catch (error) {
      this.logger.error('Error deleting photo:', error);
      throw new Error('Failed to delete photo');
    }
  }

  async uploadPhotoBase64(
    base64Image: string,
    createPhotoDto: CreatePhotoDto,
    photoUserIds: number[],
  ): Promise<Photo> {
    try {
      const buffer = Buffer.from(base64Image, 'base64');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'image.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: buffer.length,
        stream: new Readable({ read() {} }),
        destination: '',
        filename: '',
        path: '',
        buffer: buffer,
      };

      // Upload file to S3
      const s3Url = await this.s3Service.uploadFile(file, 'photos');

      // Extract S3 key from URL for future deletion
      const url = new URL(s3Url);
      const s3Key = url.pathname.substring(1); // Remove leading slash

      // Save photo metadata to database
      const photo = this.photoRepository.create({
        creator_id: createPhotoDto.creator_id,
        url: s3Url,
        s3_key: s3Key,
        visibility: createPhotoDto.visibility || 'ALL_FRIENDS',
      });

      const savedPhoto = await this.photoRepository.save(photo);
      this.logger.log(`Photo saved successfully with ID: ${savedPhoto.id}`);

      const userIds = (photoUserIds || []).map((id) => Number(id));
      console.log('userIds', userIds);

      // creator 닉네임 조회
      const creator = await this.userRepository.findOne({
        where: { id: createPhotoDto.creator_id },
      });
      const creatorNickname = creator?.nickname || '친구';

      for (const photoUserId of userIds) {
        const photoShare = this.photoRepository.create({
          creator_id: photoUserId,
          url: s3Url,
          s3_key: s3Key,
        });
        await this.photoRepository.save(photoShare);
        // 알림 생성
        await this.notificationService.createNotification(
          photoUserId,
          `${creatorNickname}님이 사진을 앨범에 등록했습니다.`,
        );
      }

      return savedPhoto;
    } catch (error) {
      this.logger.error('Error uploading photo:', error);
      throw new Error('Failed to upload photo');
    }
  }

  // Privacy and permission methods
  async canViewPhoto(photo: Photo, viewerId: number): Promise<boolean> {
    // Owner can always see their own photos
    if (photo.creator_id === viewerId) {
      return true;
    }

    // Handle different visibility levels
    switch (photo.visibility) {
      case 'PRIVATE':
        return false; // Only owner can see private photos

      case 'CLOSE_FRIENDS':
        // Check if viewer is a close friend
        return await this.isCloseFriend(photo.creator_id, viewerId);

      case 'ALL_FRIENDS':
        // Check if viewer is any kind of friend
        return await this.isFriend(photo.creator_id, viewerId);

      default:
        return false;
    }
  }

  async isFriend(userId1: number, userId2: number): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { requester_id: userId1, receiver_id: userId2, status: 'accepted' },
        { requester_id: userId2, receiver_id: userId1, status: 'accepted' },
      ],
    });
    return !!friendship;
  }

  async isCloseFriend(userId: number, friendId: number): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { requester_id: userId, receiver_id: friendId, status: 'accepted' },
        { requester_id: friendId, receiver_id: userId, status: 'accepted' },
      ],
    });

    if (!friendship) {
      return false;
    }

    // Check if the owner (userId) has marked the friend as close friend
    if (friendship.requester_id === userId) {
      return friendship.requester_close_friend;
    } else {
      return friendship.receiver_close_friend;
    }
  }

  // Verify photo access for sharing
  async verifyPhotoAccess(photoId: number, userId: number): Promise<void> {
    const photo = await this.getPhotoById(photoId);

    if (!(await this.canViewPhoto(photo, userId))) {
      throw new NotFoundException(
        `Photo with ID ${photoId} not found or you don't have permission to access it`,
      );
    }
  }

  // Update photo visibility
  async updatePhotoVisibility(
    photoId: number,
    userId: number,
    visibility: 'PRIVATE' | 'CLOSE_FRIENDS' | 'ALL_FRIENDS',
  ): Promise<Photo> {
    const photo = await this.photoRepository.findOne({
      where: { id: photoId, creator_id: userId },
    });

    if (!photo) {
      throw new NotFoundException(
        `Photo with ID ${photoId} not found or you don't have permission to modify it`,
      );
    }

    photo.visibility = visibility;
    return await this.photoRepository.save(photo);
  }
}
