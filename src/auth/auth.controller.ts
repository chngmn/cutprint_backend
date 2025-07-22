// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      nickname: string;
      profile_image_url?: string;
    },
  ) {
    const { email, password, nickname, profile_image_url } = body;
    const hashed = await bcrypt.hash(password, 10);
    try {
      const user = await this.authService.createUser(
        email,
        hashed,
        nickname,
        profile_image_url,
      );
      return { id: user.id, email: user.email, nickname: user.nickname };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Get('online/:userId')
  async isUserOnline(@Param('userId') userId: number) {
    console.log('onlineuserId', userId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return { online: false, reason: 'User not found' };
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
    const now = new Date();
    const isOnline =
      lastActive && now.getTime() - lastActive.getTime() < 5 * 60 * 1000;
    return { online: !!isOnline };
  }
}
