import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';
import { Photo } from '../entities/photo.entity';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo]),
    S3Module,
  ],
  controllers: [PhotoController],
  providers: [PhotoService],
  exports: [PhotoService],
})
export class PhotoModule {}