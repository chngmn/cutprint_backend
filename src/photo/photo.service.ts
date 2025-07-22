import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from '../entities/photo.entity';
import { S3Service } from '../s3/s3.service';
import { Readable } from 'stream';
import { NotificationService } from '../notification/notification.service';
import { User } from '../entities/user.entity';

export interface CreatePhotoDto {
  creator_id: number;
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
  ) {}

  async uploadPhoto(file: Express.Multer.File, createPhotoDto: CreatePhotoDto): Promise<Photo> {
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

  async getPhotosByUserId(userId: number): Promise<Photo[]> {
    console.log('user id', userId);
    return this.photoRepository.find({
      where: { creator_id: userId },
      relations: ['creator'],
      order: { created_at: 'DESC' },
    });
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
      throw new NotFoundException(`Photo with ID ${id} not found or you don't have permission to delete it`);
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

  async uploadPhotoBase64(base64Image: string, createPhotoDto: CreatePhotoDto, photoUserIds: number[]): Promise<Photo> {
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
      });

      const savedPhoto = await this.photoRepository.save(photo);
      this.logger.log(`Photo saved successfully with ID: ${savedPhoto.id}`);

      const userIds = (photoUserIds || []).map(id => Number(id));
      console.log('userIds', userIds);

      // creator 닉네임 조회
      const creator = await this.userRepository.findOne({ where: { id: createPhotoDto.creator_id } });
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
          `${creatorNickname}님이 사진을 앨범에 등록했습니다.`
        );
      }

      return savedPhoto;
    } catch (error) {
      this.logger.error('Error uploading photo:', error);
      throw new Error('Failed to upload photo');
    }
  }
}