import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotoService, CreatePhotoDto } from './photo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Photo } from '../entities/photo.entity';

@Controller('photos')
@UseGuards(JwtAuthGuard)
export class PhotoController {
  constructor(private readonly photoService: PhotoService) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('photo', {
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<Photo> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const createPhotoDto: CreatePhotoDto = {
      creator_id: req.user.userId,
    };

    return this.photoService.uploadPhoto(file, createPhotoDto);
  }

  @Post('upload-base64')
  async uploadPhotoBase64(
    @Body('image') image: string,
    @Request() req,
  ): Promise<Photo> {
    if (!image) {
      throw new BadRequestException('No image data provided');
    }
    const photoUserIds = req.body.friendIds;

    const createPhotoDto: CreatePhotoDto = {
      creator_id: req.user.userId,
    };

    return this.photoService.uploadPhotoBase64(image, createPhotoDto, photoUserIds);
  }

  @Get()
  async getAllPhotos(): Promise<Photo[]> {
    return this.photoService.getAllPhotos();
  }

  @Get('my-photos')
  async getMyPhotos(@Req() req) {
    // 사용자 인증이 필요하다면, req.user 등을 활용
    console.log('userId', req.user.userId);
    return this.photoService.getPhotosByUserId(req.user.userId);
    
  }

  @Get('user/:userId')
  async getUserPhotos(@Param('userId', ParseIntPipe) userId: number): Promise<Photo[]> {
    console.log('photo controller user id', userId);
    return this.photoService.getPhotosByUserId(userId);
  }

  @Get(':id')
  async getPhoto(@Param('id', ParseIntPipe) id: number): Promise<Photo> {
    return this.photoService.getPhotoById(id);
  }

  @Get(':id/share')
  async getPhotoForSharing(@Param('id', ParseIntPipe) id: number): Promise<{ photo: Photo }> {
    const photo = await this.photoService.getPhotoById(id);
    return { photo };
  }

  @Delete(':id')
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.photoService.deletePhoto(id, req.user.userId);
    return { message: 'Photo deleted successfully' };
  }
}