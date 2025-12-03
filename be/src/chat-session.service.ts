import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { QdrantService } from "./qdrant.service";
import {
  ChatSessionDto,
  ChatSessionDetailDto,
  CreateChatSessionDto,
  GetChatSessionsQuery,
  PaginatedResponse,
  UpdateChatSessionTitleDto,
  ChatMessageDto,
  GetMessagesQuery,
  SendMessageDto,
  MessageType,
  MessageFeedbackDto,
} from "./types/chat-session";
import { HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatZhipuAI } from "@langchain/community/chat_models/zhipuai";
@Injectable()
export class ChatSessionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly qdrantService: QdrantService,
  ) {}

  static createChatModel(): ChatZhipuAI {
    if (!process.env.ZHIPU_API_KEY) {
      throw new Error("ZHIPU_API_KEY is not set");
    }
    return new ChatZhipuAI({
      apiKey: process.env.ZHIPU_API_KEY,
      model: "glm-4",
    });
  }

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

  /**
   * 获取会话的消息列表（带分页）
   */
  async getMessages(
    userId: string,
    sessionId: string,
    query: GetMessagesQuery,
  ): Promise<PaginatedResponse<ChatMessageDto>> {
    // 验证会话是否存在且属于当前用户
    const session = await this.prismaService.client.chatSession.findUnique({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new HttpException("Chat session not found", HttpStatus.NOT_FOUND);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    // 查询消息总数
    const total = await this.prismaService.client.chatMessage.count({
      where: { sessionId },
    });

    // 查询消息列表，按时间升序排列
    const messages = await this.prismaService.client.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    });

    // 转换为DTO
    const items: ChatMessageDto[] = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      message_type: message.userMessageType as MessageType,
      audio_file_path: message.audioFilePath ?? undefined,
      image_file_path: message.imageFilePath ?? undefined,
      createdAt: message.createdAt.toISOString(),
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
   * 发送消息（支持流式响应）
   */
  async sendMessage(
    userId: string,
    sessionId: string,
    data: SendMessageDto,
  ): Promise<{
    userMessage: ChatMessageDto;
    generateAssistantResponse: (
      callback: (chunk: string) => Promise<void>,
    ) => Promise<void>;
  }> {
    // 验证会话是否存在且属于当前用户
    const session = await this.prismaService.client.chatSession.findUnique({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new HttpException("Chat session not found", HttpStatus.NOT_FOUND);
    }

    // 创建用户消息
    const userMessage = await this.prismaService.client.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: data.content,
        userMessageType: data.message_type,
        audioFilePath: data.audio_file_path,
        imageFilePath: data.image_file_path,
      },
    });

    // 更新会话的最后消息时间和消息数量
    await this.prismaService.client.chatSession.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
    });

    // 转换用户消息为DTO
    const userMessageDto: ChatMessageDto = {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      message_type: userMessage.userMessageType as MessageType,
      audio_file_path: userMessage.audioFilePath ?? undefined,
      image_file_path: userMessage.imageFilePath ?? undefined,
      createdAt: userMessage.createdAt.toISOString(),
    };

    // 生成助手响应的函数（用于流式返回）
    const generateAssistantResponse = async (
      callback: (chunk: string) => Promise<void>,
    ): Promise<void> => {
      try {
        // 创建LLM模型实例
        const model = ChatSessionService.createChatModel();

        // 使用StringOutputParser来处理模型输出
        const parser = new StringOutputParser();

        // 构建消息链
        const chain = model.pipe(parser);

        // RAG过程：获取与用户查询相关的上下文
        const context = await this.qdrantService.buildContext(data.content);

        // 拼接适合RAG的prompt
        const prompt = `基于以下上下文信息回答用户问题：

上下文信息：
${context}

用户问题：${data.content}

请根据上下文信息进行回答，如果上下文信息不足，请明确说明`;

        // 准备用户消息
        const messages = [new HumanMessage(prompt)];

        // 流式获取响应
        const accumulatedResponse: string[] = [];
        const stream = await chain.stream(messages);

        // 处理流中的每个块
        for await (const chunk of stream) {
          accumulatedResponse.push(chunk);
          await callback(chunk);
        }

        // 保存助手回复到数据库
        await this.prismaService.client.chatMessage.create({
          data: {
            sessionId,
            role: "assistant",
            content: accumulatedResponse.join(""),
          },
        });
      } catch (error) {
        console.error("Error generating assistant response:", error);
        // 生成错误回复
        const errorMessage = "抱歉，生成回复时出现了错误。请稍后重试。";
        await callback(errorMessage);

        // 保存错误回复到数据库
        await this.prismaService.client.chatMessage.create({
          data: {
            sessionId,
            role: "assistant",
            content: errorMessage,
          },
        });
      }
    };

    return {
      userMessage: userMessageDto,
      generateAssistantResponse,
    };
  }

  /**
   * 创建消息反馈
   */
  async createMessageFeedback(
    userId: string,
    messageId: string,
    data: MessageFeedbackDto,
  ): Promise<void> {
    // 查找消息，确保存在且属于当前用户
    const message = await this.prismaService.client.chatMessage.findFirst({
      where: {
        id: messageId,
        session: {
          userId,
        },
      },
    });

    if (!message) {
      throw new HttpException("Message not found", HttpStatus.NOT_FOUND);
    }

    // 创建反馈记录
    await this.prismaService.client.messageFeedback.create({
      data: {
        messageId,
        rating: data.rating,
        feedbackText: data.feedback_text,
      },
    });
  }
}
