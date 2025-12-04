import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { Prisma } from "@prisma/client";
import type {
  UserDto,
  UpdateProfileInput,
  UpdateRoleInput,
  GetUsersQuery,
  PaginatedResponse,
} from "./types/types";

interface UserModel {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: string;
  createdAt: Date;
  isActive: boolean;
  lastLoginAt?: Date | null;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取当前用户信息
   */
  async getProfile(userId: string): Promise<UserDto> {
    this.logger.log(`获取用户 ${userId} 的个人资料`);
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`用户 ${userId} 不存在`);
      throw new NotFoundException("用户不存在");
    }

    this.logger.log(`成功获取用户 ${userId} 的个人资料`);
    return this.mapUserToDto(user);
  }

  /**
   * 更新用户个人资料
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<UserDto> {
    this.logger.log(`更新用户 ${userId} 的个人资料`);
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`用户 ${userId} 不存在，无法更新个人资料`);
      throw new NotFoundException("用户不存在");
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        displayName: input.display_name,
        avatarUrl: input.avatar_url,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`成功更新用户 ${userId} 的个人资料`);
    return this.mapUserToDto(updatedUser);
  }

  /**
   * 获取用户列表（支持分页、搜索和角色筛选）
   */
  async getUsers(query: GetUsersQuery): Promise<PaginatedResponse<UserDto>> {
    this.logger.log(`获取用户列表，查询条件: ${JSON.stringify(query)}`);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { displayName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    // 获取总数
    const total = await this.prisma.client.user.count({ where });

    // 获取分页数据
    const users = await this.prisma.client.user.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    this.logger.log(`成功获取用户列表，共 ${total} 个用户，当前第 ${page} 页`);
    return {
      data: users.map((user) => this.mapUserToDto(user)),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 更新用户角色
   */
  async updateUserRole(
    userId: string,
    input: UpdateRoleInput,
    currentUserId: string,
  ): Promise<UserDto> {
    this.logger.log(
      `用户 ${currentUserId} 尝试更新用户 ${userId} 的角色为 ${input.role}`,
    );
    // 验证当前用户是否为管理员
    const currentUser = await this.prisma.client.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser || currentUser.role !== "admin") {
      this.logger.warn(`用户 ${currentUserId} 尝试更新角色，但不是管理员`);
      throw new ForbiddenException("只有管理员可以更新用户角色");
    }

    // 不能更改自己的角色
    if (currentUserId === userId) {
      this.logger.warn(
        `管理员 ${currentUserId} 尝试更改自己的角色，操作被拒绝`,
      );
      throw new ForbiddenException("不能更改自己的角色");
    }

    // 查找目标用户
    const targetUser = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      this.logger.warn(
        `用户 ${currentUserId} 尝试更新角色，但目标用户 ${userId} 不存在`,
      );
      throw new NotFoundException("目标用户不存在");
    }

    // 更新角色
    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        role: input.role,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `管理员 ${currentUserId} 成功将用户 ${userId} 的角色更新为 ${input.role}`,
    );
    return this.mapUserToDto(updatedUser);
  }

  /**
   * 根据ID获取用户信息（内部使用）
   */
  async getUserById(userId: string): Promise<UserDto | null> {
    this.logger.log(`根据ID获取用户信息: ${userId}`);
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`根据ID获取用户信息失败: ${userId} 不存在`);
      return null;
    }

    this.logger.log(`根据ID获取用户信息成功: ${userId}`);
    return this.mapUserToDto(user);
  }

  /**
   * 将数据库用户模型映射到DTO
   */
  private mapUserToDto(user: UserModel): UserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.displayName ?? undefined,
      avatar_url: user.avatarUrl ?? undefined,
      role: user.role,
      created_at: user.createdAt,
      is_active: user.isActive,
      last_login_at: user.lastLoginAt ?? undefined,
    };
  }
}
