import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from './auth.guard';

interface UserDto {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  created_at: Date;
  is_active: boolean;
  last_login_at?: Date;
}

interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
}

interface UpdateRoleInput {
  role: 'admin' | 'editor' | 'user';
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

@Controller('api/users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前用户资料
   * GET /api/users/profile
   * Headers: { Authorization: Bearer {token} }
   */
  @Get('profile')
  async getProfile(@Req() req: { user?: { id: string } }): Promise<UserDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('用户未认证');
    }
    return this.userService.getProfile(userId);
  }

  /**
   * 更新当前用户资料
   * PUT /api/users/profile
   * Headers: { Authorization: Bearer {token} }
   */
  @Put('profile')
  async updateProfile(
    @Req() req: { user?: { id: string } },
    @Body() body: UpdateProfileInput,
  ): Promise<UserDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('用户未认证');
    }
    return this.userService.updateProfile(userId, body);
  }

  /**
   * 获取用户列表
   * GET /api/users
   * Headers: { Authorization: Bearer {token} }
   */
  @Get()
  async getUsers(
    @Req() req: { user?: { id: string } },
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
    },
  ): Promise<PaginatedResponse<UserDto>> {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('用户未认证');
    }
    return this.userService.getUsers(query);
  }

  /**
   * 更新用户角色
   * PUT /api/users/:id/role
   * Headers: { Authorization: Bearer {token} }
   */
  @Put(':id/role')
  async updateUserRole(
    @Req() req: { user?: { id: string } },
    @Param('id') userId: string,
    @Body() body: UpdateRoleInput,
  ): Promise<UserDto> {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('用户未认证');
    }
    return this.userService.updateUserRole(userId, body, currentUserId);
  }
}
