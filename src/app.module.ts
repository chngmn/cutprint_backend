import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity'; // User 엔티티 import
import { Photo } from './entities/photo.entity';
import { Friendship } from './entities/friendship.entity'; // User 엔티티 import
// import { PhotoSession } from './entities/photo-session.entity'; // User 엔티티 import
// import { SessionInvite } from './entities/session-invite.entity'; // User 엔티티 import
import { Notification } from './entities/notification.entity';
import { AuthModule } from './auth/auth.module';
import { FriendshipModule } from './friendship/friendship.module';
import { ConfigModule } from '@nestjs/config';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import awsConfig from './config/aws.config';
import { PhotoModule } from './photo/photo.module';
import { UpdateLastActiveInterceptor } from './update-last-active.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [awsConfig],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres', // 데이터베이스 타입
      host: 'localhost', // PostgreSQL 호스트 (로컬 머신)
      port: 5432, // PostgreSQL 기본 포트
      username: 'seokyung', // 이전에 psql로 접속했던 사용자 이름
      password: '', // 비밀번호 (설정하지 않았다면 빈 문자열)
      database: 'postgres', // 연결할 데이터베이스 이름 (기본 postgres 사용)
      entities: [User, Friendship, Photo, Notification], // 엔티티 파일들을 여기에 등록합니다 (아래에서 설명)
      synchronize: true, // 개발 단계에서만 사용 권장: 엔티티 기반으로 DB 스키마 자동 동기화
      autoLoadEntities: true, // 엔티티 파일 자동 로드
      namingStrategy: new SnakeNamingStrategy(),
    }),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    FriendshipModule,
    PhotoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: UpdateLastActiveInterceptor,
    },
  ],
})
export class AppModule {}
