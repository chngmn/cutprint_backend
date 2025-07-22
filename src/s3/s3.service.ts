import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('aws.region')!,
      credentials: {
        accessKeyId: this.configService.get('aws.accessKeyId')!,
        secretAccessKey: this.configService.get('aws.secretAccessKey')!,
      },
    });
    this.bucketName = this.configService.get('aws.s3.bucketName')!;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'photos',
  ): Promise<string> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read', // Make files publicly accessible
        },
      });

      const result = await upload.done();
      const fileUrl = `https://${this.bucketName}.s3.${this.configService.get('aws.region')}.amazonaws.com/${fileName}`;

      this.logger.log(`File uploaded successfully: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      this.logger.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1); // Remove leading slash

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `https://${this.bucketName}.s3.${this.configService.get('aws.region')}.amazonaws.com/${key}`;
  }

  // Generate presigned URL for direct upload from frontend (optional advanced feature)
  // async generatePresignedUploadUrl(fileName: string, contentType: string): Promise<string> {
  //   const command = new PutObjectCommand({
  //     Bucket: this.bucketName,
  //     Key: `photos/${fileName}`,
  //     ContentType: contentType,
  //   });
  //
  //   return await getSignedUrl(this.s3Client, command, { expiresIn: 300 }); // 5 minutes
  // }
}
