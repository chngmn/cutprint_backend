import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('friendship')
@UseGuards(JwtAuthGuard)
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  // 친구 요청 보내기
  @Post('request')
  async sendFriendRequest(
    @Body() body: { receiverId: number },
    @Request() req,
  ) {
    const friendship = await this.friendshipService.sendFriendRequest(
      req.user.userId,
      body.receiverId,
    );
    return {
      success: true,
      message: '친구 요청을 보냈습니다.',
      data: friendship,
    };
  }

  // 친구 요청 수락
  @Post('accept/:requestId')
  async acceptFriendRequest(
    @Param('requestId') requestId: number,
    @Request() req,
  ) {
    const friendship = await this.friendshipService.acceptFriendRequest(
      requestId,
      req.user.userId,
    );
    return {
      success: true,
      message: '친구 요청을 수락했습니다.',
      data: friendship,
    };
  }

  // 친구 요청 거절
  @Post('decline/:requestId')
  async declineFriendRequest(
    @Param('requestId') requestId: number,
    @Request() req,
  ) {
    await this.friendshipService.declineFriendRequest(
      requestId,
      req.user.userId,
    );
    return {
      success: true,
      message: '친구 요청을 거절했습니다.',
    };
  }

  // 친구 요청 취소
  @Delete('cancel/:requestId')
  async cancelFriendRequest(
    @Param('requestId') requestId: number,
    @Request() req,
  ) {
    await this.friendshipService.cancelFriendRequest(
      requestId,
      req.user.userId,
    );
    return {
      success: true,
      message: '친구 요청을 취소했습니다.',
    };
  }

  // 내 친구 목록 조회
  @Get('friends')
  async getFriends(@Request() req) {
    const friends = await this.friendshipService.getFriends(req.user.userId);
    return {
      success: true,
      data: friends.map((friend) => ({
        id: friend.id.toString(),
        name: friend.nickname,
        profileImage: friend.profile_image_url,
        status: '온라인', // 실제로는 온라인 상태를 관리하는 로직이 필요
        isCloseFriend: friend.isCloseFriend,
      })),
    };
  }

  // 받은 친구 요청 목록 조회
  @Get('requests/received')
  async getReceivedFriendRequests(@Request() req) {
    const requests = await this.friendshipService.getReceivedFriendRequests(
      req.user.userId,
    );
    return {
      success: true,
      data: requests.map((request) => ({
        id: request.id.toString(),
        name: request.user.nickname,
        profileImage: request.user.profile_image_url,
        status: 'pending',
        requested_at: request.requested_at,
      })),
    };
  }

  // 보낸 친구 요청 목록 조회
  @Get('requests/sent')
  async getSentFriendRequests(@Request() req) {
    const requests = await this.friendshipService.getSentFriendRequests(
      req.user.userId,
    );
    return {
      success: true,
      data: requests.map((request) => ({
        id: request.id.toString(),
        name: request.user.nickname,
        profileImage: request.user.profile_image_url,
        status: 'pending',
        requested_at: request.requested_at,
      })),
    };
  }

  // 사용자 검색
  @Get('search')
  async searchUsers(@Query('q') query: string, @Request() req) {
    if (!query || query.trim() === '') {
      return {
        success: true,
        data: [],
      };
    }

    const users = await this.friendshipService.searchUsers(
      query,
      req.user.userId,
    );
    return {
      success: true,
      data: users,
    };
  }

  // 친구 삭제
  @Delete('remove/:friendId')
  async removeFriend(@Param('friendId') friendId: number, @Request() req) {
    await this.friendshipService.removeFriend(req.user.userId, friendId);
    return {
      success: true,
      message: '친구를 삭제했습니다.',
    };
  }

  // 친한 친구 토글
  @Post('close-friend/:friendId')
  async toggleCloseFriend(@Param('friendId') friendId: number, @Request() req) {
    const result = await this.friendshipService.toggleCloseFriend(
      req.user.userId,
      friendId,
    );
    return {
      success: true,
      message: result.isCloseFriend
        ? '친한 친구로 지정했습니다.'
        : '친한 친구 지정을 해제했습니다.',
      data: result,
    };
  }

  // 친한 친구 목록 조회
  @Get('close-friends')
  async getCloseFriends(@Request() req) {
    const closeFriends = await this.friendshipService.getCloseFriends(
      req.user.userId,
    );
    return {
      success: true,
      data: closeFriends.map((friend) => ({
        id: friend.id.toString(),
        name: friend.nickname,
        profileImage: friend.profile_image_url,
        status: '온라인', // 실제로는 온라인 상태를 관리하는 로직이 필요
        isCloseFriend: true,
      })),
    };
  }
}
