import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from '../entities/friendship.entity';
import { User } from '../entities/user.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
  ) {}

  // 친구 요청 보내기
  async sendFriendRequest(requesterId: number, receiverId: number): Promise<Friendship> {
    if (requesterId === receiverId) {
      throw new BadRequestException('자기 자신에게 친구 요청을 보낼 수 없습니다.');
    }

    // 받는 사람이 존재하는지 확인
    const receiver = await this.userRepository.findOne({ where: { id: receiverId } });
    if (!receiver) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 요청자 정보 조회 (닉네임용)
    const requester = await this.userRepository.findOne({ where: { id: requesterId } });
    const requesterNickname = requester?.nickname || '알 수 없음';

    // 이미 친구 요청이 있는지 확인 (양방향)
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { requester_id: requesterId, receiver_id: receiverId },
        { requester_id: receiverId, receiver_id: requesterId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        throw new BadRequestException('이미 친구입니다.');
      } else if (existingFriendship.status === 'pending') {
        throw new BadRequestException('이미 친구 요청이 있습니다.');
      }
    }

    const friendship = this.friendshipRepository.create({
      requester_id: requesterId,
      receiver_id: receiverId,
      status: 'pending',
    });

    const saved = await this.friendshipRepository.save(friendship);

    // 알림 생성
    await this.notificationService.createNotification(
      receiverId,
      `${requesterNickname}님이 친구 요청을 보냈습니다.`
    );

    return saved;
  }

  // 친구 요청 수락
  async acceptFriendRequest(requestId: number, userId: number): Promise<Friendship> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: requestId, receiver_id: userId, status: 'pending' }
    });

    if (!friendship) {
      throw new NotFoundException('친구 요청을 찾을 수 없습니다.');
    }

    friendship.status = 'accepted';
    friendship.responded_at = new Date();

    const saved = await this.friendshipRepository.save(friendship);

    // 친구가 된 두 사람의 닉네임 조회
    const receiver = await this.userRepository.findOne({ where: { id: friendship.receiver_id } });
    const requester = await this.userRepository.findOne({ where: { id: friendship.requester_id } });
    const receiverNickname = receiver?.nickname || '상대방';
    const requesterNickname = requester?.nickname || '상대방';

    // 두 사람 모두에게 알림
    await this.notificationService.createNotification(
      friendship.requester_id,
      `${receiverNickname}님과 친구가 되었습니다.`
    );
    await this.notificationService.createNotification(
      friendship.receiver_id,
      `${requesterNickname}님과 친구가 되었습니다.`
    );

    return saved;
  }

  // 친구 요청 거절
  async declineFriendRequest(requestId: number, userId: number): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: requestId, receiver_id: userId, status: 'pending' }
    });

    if (!friendship) {
      throw new NotFoundException('친구 요청을 찾을 수 없습니다.');
    }

    friendship.status = 'rejected';
    friendship.responded_at = new Date();
    await this.friendshipRepository.save(friendship);
  }

  // 친구 요청 취소
  async cancelFriendRequest(requestId: number, userId: number): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: requestId, requester_id: userId, status: 'pending' }
    });

    if (!friendship) {
      throw new NotFoundException('친구 요청을 찾을 수 없습니다.');
    }

    await this.friendshipRepository.remove(friendship);
  }

  // 내 친구 목록 조회 (친한 친구 정보 포함)
  async getFriends(userId: number): Promise<any[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requester_id: userId, status: 'accepted' },
        { receiver_id: userId, status: 'accepted' }
      ],
      relations: ['requester', 'receiver']
    });

    // 내가 아닌 상대방 정보와 친한 친구 여부 반환
    return friendships.map(friendship => {
      const friend = friendship.requester_id === userId ? friendship.receiver : friendship.requester;
      const isCloseFriend = friendship.requester_id === userId ? 
        friendship.requester_close_friend : 
        friendship.receiver_close_friend;
      
      return {
        ...friend,
        isCloseFriend
      };
    });
  }

  // 받은 친구 요청 목록 조회
  async getReceivedFriendRequests(userId: number): Promise<{ id: number; user: User; requested_at: Date }[]> {
    const friendships = await this.friendshipRepository.find({
      where: { receiver_id: userId, status: 'pending' },
      relations: ['requester'],
      order: { requested_at: 'DESC' }
    });

    return friendships.map(friendship => ({
      id: friendship.id,
      user: friendship.requester,
      requested_at: friendship.requested_at
    }));
  }

  // 보낸 친구 요청 목록 조회
  async getSentFriendRequests(userId: number): Promise<{ id: number; user: User; requested_at: Date }[]> {
    const friendships = await this.friendshipRepository.find({
      where: { requester_id: userId, status: 'pending' },
      relations: ['receiver'],
      order: { requested_at: 'DESC' }
    });

    return friendships.map(friendship => ({
      id: friendship.id,
      user: friendship.receiver,
      requested_at: friendship.requested_at
    }));
  }

  // 사용자 검색
  async searchUsers(query: string, currentUserId: number): Promise<any[]> {
    const users = await this.userRepository.createQueryBuilder('user')
      .where('user.nickname ILIKE :query OR user.email ILIKE :query', { query: `%${query}%` })
      .andWhere('user.id != :currentUserId', { currentUserId })
      .getMany();

    // 각 사용자와의 친구 관계 상태 확인
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = await this.friendshipRepository.findOne({
          where: [
            { requester_id: currentUserId, receiver_id: user.id },
            { requester_id: user.id, receiver_id: currentUserId }
          ]
        });

        let isFriend = false;
        let hasSentRequest = false;
        let hasReceivedRequest = false;

        if (friendship) {
          if (friendship.status === 'accepted') {
            isFriend = true;
          } else if (friendship.status === 'pending') {
            if (friendship.requester_id === currentUserId) {
              hasSentRequest = true;
            } else {
              hasReceivedRequest = true;
            }
          }
        }

        return {
          id: user.id.toString(),
          name: user.nickname,
          profileImage: user.profile_image_url,
          isFriend,
          hasSentRequest,
          hasReceivedRequest
        };
      })
    );

    return usersWithStatus;
  }

  // 친구 삭제
  async removeFriend(userId: number, friendId: number): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { requester_id: userId, receiver_id: friendId, status: 'accepted' },
        { requester_id: friendId, receiver_id: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      throw new NotFoundException('친구 관계를 찾을 수 없습니다.');
    }

    await this.friendshipRepository.remove(friendship);
  }

  // 친한 친구 토글
  async toggleCloseFriend(userId: number, friendId: number): Promise<{ isCloseFriend: boolean }> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { requester_id: userId, receiver_id: friendId, status: 'accepted' },
        { requester_id: friendId, receiver_id: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      throw new NotFoundException('친구 관계를 찾을 수 없습니다.');
    }

    // 현재 사용자가 requester인지 receiver인지 확인하고 해당 필드 토글
    if (friendship.requester_id === userId) {
      friendship.requester_close_friend = !friendship.requester_close_friend;
      await this.friendshipRepository.save(friendship);
      return { isCloseFriend: friendship.requester_close_friend };
    } else {
      friendship.receiver_close_friend = !friendship.receiver_close_friend;
      await this.friendshipRepository.save(friendship);
      return { isCloseFriend: friendship.receiver_close_friend };
    }
  }

  // 친한 친구 목록 조회
  async getCloseFriends(userId: number): Promise<any[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requester_id: userId, status: 'accepted', requester_close_friend: true },
        { receiver_id: userId, status: 'accepted', receiver_close_friend: true }
      ],
      relations: ['requester', 'receiver']
    });

    // 친한 친구로 지정된 상대방 정보만 반환
    return friendships.map(friendship => {
      const friend = friendship.requester_id === userId ? friendship.receiver : friendship.requester;
      return {
        ...friend,
        isCloseFriend: true
      };
    });
  }
}