import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import {
  ChatSessionDto,
  ChatSessionDetailDto,
  CreateChatSessionDto,
  GetChatSessionsQuery,
  PaginatedResponse,
  UpdateChatSessionTitleDto,
  ChatMessageDto,
} from "./types/chat-session";

@Injectable()
export class ChatSessionService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 获取用户的聊天会话列表（带分页）
   */
  async getChatSessions(
    userId: string,
    query: GetChatSessionsQuery,
  ): Promise<PaginatedResponse<ChatSessionDto>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where = {
      userId,
    };

    // 如果指定了is_active筛选条件
    if (query.is_active !== undefined) {
      Object.assign(where, { isActive: query.is_active });
    }

    // 查询总数
    const total = await this.prismaService.client.chatSession.count({ where });

    // 查询会话列表，按最后消息时间降序排列
    const sessions = await this.prismaService.client.chatSession.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: limit,
    });

    // 转换为DTO
    const items: ChatSessionDto[] = sessions.map((session) => ({
      id: session.id,
      title: session.title || undefined, // 处理null值
      messageCount: session.messageCount,
      lastMessageAt: session.lastMessageAt?.toISOString(),
      isActive: session.isActive,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
      hasNextPage: skip + limit < total,
    };
  }

  /**
   * 创建新的聊天会话
   */
  async createChatSession(
    userId: string,
    data: CreateChatSessionDto,
  ): Promise<ChatSessionDto> {
    const session = await this.prismaService.client.chatSession.create({
      data: {
        userId,
        title: data.title,
      },
    });

    return {
      id: session.id,
      title: session.title ?? undefined,
      messageCount: session.messageCount,
      lastMessageAt: session.lastMessageAt?.toISOString(),
      isActive: session.isActive,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  /**
   * 获取聊天会话详情
   */
  async getChatSessionById(
    userId: string,
    sessionId: string,
  ): Promise<ChatSessionDetailDto> {
    // 查询会话信息，确保属于当前用户
    const session = await this.prismaService.client.chatSession.findUnique({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100, // 限制返回最近的100条消息
        },
      },
    });

    if (!session) {
      throw new HttpException("Chat session not found", HttpStatus.NOT_FOUND);
    }

    // 转换消息为DTO
    const messages: ChatMessageDto[] = session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    }));

    return {
      id: session.id,
      title: session.title || undefined, // 处理null值
      messageCount: session.messageCount,
      lastMessageAt: session.lastMessageAt?.toISOString(),
      isActive: session.isActive,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messages,
    };
  }

  /**
   * 删除聊天会话
   */
  async deleteChatSession(userId: string, sessionId: string): Promise<void> {
    // 检查会话是否存在且属于当前用户
    const session = await this.prismaService.client.chatSession.findUnique({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new HttpException("Chat session not found", HttpStatus.NOT_FOUND);
    }

    // 使用事务删除会话及其相关消息
    await this.prismaService.client.$transaction(async (prisma) => {
      // 删除相关消息
      await prisma.chatMessage.deleteMany({
        where: { sessionId },
      });

      // 删除会话
      await prisma.chatSession.delete({ where: { id: sessionId } });
    });
  }

  /**
   * 更新聊天会话标题
   */
  async updateChatSessionTitle(
    userId: string,
    sessionId: string,
    data: UpdateChatSessionTitleDto,
  ): Promise<ChatSessionDto> {
    // 更新会话标题，确保属于当前用户
    try {
      const session = await this.prismaService.client.chatSession.update({
        where: {
          id: sessionId,
          userId,
        },
        data: {
          title: data.title,
        },
      });

      return {
        id: session.id,
        title: session.title ?? undefined,
        messageCount: session.messageCount,
        lastMessageAt: session.lastMessageAt?.toISOString(),
        isActive: session.isActive,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      };
    } catch {
      throw new HttpException("Chat session not found", HttpStatus.NOT_FOUND);
    }
  }
}
