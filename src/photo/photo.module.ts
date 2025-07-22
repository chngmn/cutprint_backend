import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';
import { Photo } from '../entities/photo.entity';
import { S3Module } from '../s3/s3.module';
import { NotificationModule } from '../notification/notification.module';
import { User } from '../entities/user.entity';
import { Friendship } from '../entities/friendship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo, User, Friendship]),
    S3Module,
    NotificationModule,
  ],
  controllers: [PhotoController],
  providers: [PhotoService],
  exports: [PhotoService],
})
export class PhotoModule {}