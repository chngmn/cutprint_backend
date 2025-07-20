// src/auth/auth.controller.ts
import { Controller, Post, Body, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string, password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: { email: string, password: string, nickname: string, profile_image_url?: string }) {
    const { email, password, nickname, profile_image_url } = body;
    const hashed = await bcrypt.hash(password, 10);
    try {
      const user = await this.authService.createUser(email, hashed, nickname, profile_image_url);
      return { id: user.id, email: user.email, nickname: user.nickname };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}