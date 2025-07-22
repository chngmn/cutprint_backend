// src/notification/notification.controller.ts
import { Controller, Get, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserNotifications(@Req() req) {
    // req.user.userId는 jwt.strategy.ts에서 payload.sub로 세팅됨
    return this.notificationService.getNotificationsByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread')
  async getUnreadNotifications(@Req() req) {
    return this.notificationService.getUnreadNotificationsByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markNotificationAsRead(@Param('id') id: number, @Req() req) {
    return this.notificationService.markAsRead(Number(id), req.user.userId);
  }
} 