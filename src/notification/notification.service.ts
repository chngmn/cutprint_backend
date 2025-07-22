// src/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(userId: number, message: string) {
    const notification = this.notificationRepository.create({
      user_id: userId,
      message,
    });
    return this.notificationRepository.save(notification);
  }

  async getNotificationsByUser(userId: number) {
    return this.notificationRepository.find({
      where: { user_id: userId, is_read: false },
      order: { created_at: 'DESC' },
    });
  }

  async getUnreadNotificationsByUser(userId: number) {
    return this.notificationRepository.find({
      where: { user_id: userId, is_read: false },
      order: { created_at: 'DESC' },
    });
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });
    if (!notification) {
      throw new Error('Notification not found or access denied');
    }
    notification.is_read = true;
    return this.notificationRepository.save(notification);
  }
}
