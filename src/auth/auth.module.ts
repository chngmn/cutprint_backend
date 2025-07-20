// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),

    // ① ConfigModule 을 import
    ConfigModule,

    // ② JwtModule 을 registerAsync 로 설정
    JwtModule.registerAsync({
      imports: [ConfigModule],           // ConfigModule 주입
      inject: [ConfigService],          // ConfigService 주입
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),      // 이제 undefined 걱정 없음
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
