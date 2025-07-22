import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Observable } from 'rxjs';

@Injectable()
export class UpdateLastActiveInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user && user.userId) {
      // 비동기로 lastActiveAt 업데이트 (응답과 무관하게)
      this.userRepository.update(user.userId, { lastActiveAt: new Date() });
    }
    return next.handle();
  }
}
