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
    @Body('visibility') visibility: 'PRIVATE' | 'CLOSE_FRIENDS' | 'ALL_FRIENDS',
    @Request() req,
  ): Promise<Photo> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const createPhotoDto: CreatePhotoDto = {
      creator_id: req.user.userId,
      visibility: visibility || 'ALL_FRIENDS',
    };

    return this.photoService.uploadPhoto(file, createPhotoDto);
  }

  @Post('upload-base64')
  async uploadPhotoBase64(
    @Body('image') image: string,
    @Body('visibility') visibility: 'PRIVATE' | 'CLOSE_FRIENDS' | 'ALL_FRIENDS',
    @Request() req,
  ): Promise<Photo> {
    if (!image) {
      throw new BadRequestException('No image data provided');
    }
    const photoUserIds = req.body.friendIds;

    const createPhotoDto: CreatePhotoDto = {
      creator_id: req.user.userId,
      visibility: visibility || 'ALL_FRIENDS',
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
  async getUserPhotos(@Param('userId', ParseIntPipe) userId: number, @Req() req): Promise<Photo[]> {
    console.log('photo controller user id', userId);
    return this.photoService.getPhotosByUserId(userId, req.user.userId);
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

  @Post(':id/visibility')
  async updatePhotoVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body('visibility') visibility: 'PRIVATE' | 'CLOSE_FRIENDS' | 'ALL_FRIENDS',
    @Request() req,
  ): Promise<{ message: string; photo: Photo }> {
    if (!visibility) {
      throw new BadRequestException('Visibility is required');
    }
    
    const photo = await this.photoService.updatePhotoVisibility(id, req.user.userId, visibility);
    return { 
      message: 'Photo visibility updated successfully',
      photo 
    };
  }
}