// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async createUser(
    email: string,
    password: string,
    nickname: string,
    profile_image_url?: string,
  ) {
    // 이메일, 닉네임 중복 체크
    const existingEmail = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new Error('이미 사용 중인 이메일입니다.');
    }
    const existingNickname = await this.usersRepository.findOne({
      where: { nickname },
    });
    if (existingNickname) {
      throw new Error('이미 사용 중인 닉네임입니다.');
    }
    const user = this.usersRepository.create({
      email,
      password_hash: password,
      nickname,
      auth_provider: 'local',
      profile_image_url: profile_image_url || undefined,
    });
    return this.usersRepository.save(user);
  }
}
