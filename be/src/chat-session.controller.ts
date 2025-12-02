import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  RequestMethod,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ChatSessionService } from "./chat-session.service";
import { Sse } from "@nestjs/common";
import type {
  ChatSessionDto,
  ChatSessionDetailDto,
  CreateChatSessionDto,
  GetChatSessionsQuery,
  PaginatedResponse,
  UpdateChatSessionTitleDto,
  GetMessagesQuery,
  SendMessageDto,
  ChatMessageDto,
} from "./types/chat-session";
import { Observable, Subject } from "rxjs";

// 自定义MessageEvent接口
export interface ServerSentEvent<T = any> {
  data: T;
}

@Controller("api/chat/sessions")
@UseGuards(AuthGuard("jwt"))
export class ChatSessionController {
  constructor(private readonly chatSessionService: ChatSessionService) {}

  /**
   * 获取聊天会话列表（带分页）
   * GET /api/chat/sessions
   */
  @Get()
  async getChatSessions(
    @Request() req: { user: { id: string } },
    @Query() query: GetChatSessionsQuery,
  ): Promise<PaginatedResponse<ChatSessionDto>> {
    const userId = req.user.id;
    return this.chatSessionService.getChatSessions(userId, query);
  }

  /**
   * 创建新的聊天会话
   * POST /api/chat/sessions
   */
  @Post()
  async createChatSession(
    @Request() req: { user: { id: string } },
    @Body() data: CreateChatSessionDto,
  ): Promise<ChatSessionDto> {
    const userId = req.user.id;
    return this.chatSessionService.createChatSession(userId, data);
  }

  /**
   * 获取聊天会话详情
   * GET /api/chat/sessions/:sessionId
   */
  @Get(":sessionId")
  async getChatSessionById(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
  ): Promise<ChatSessionDetailDto> {
    const userId = req.user.id;
    return this.chatSessionService.getChatSessionById(userId, sessionId);
  }

  /**
   * 删除聊天会话
   * DELETE /api/chat/sessions/:sessionId
   */
  @Delete(":sessionId")
  async deleteChatSession(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
  ): Promise<{ status: string }> {
    const userId = req.user.id;
    await this.chatSessionService.deleteChatSession(userId, sessionId);
    return { status: "success" };
  }

  /**
   * 更新聊天会话标题
   * PUT /api/chat/sessions/:sessionId/title
   */
  @Put(":sessionId/title")
  async updateChatSessionTitle(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
    @Body() data: UpdateChatSessionTitleDto,
  ): Promise<ChatSessionDto> {
    const userId = req.user.id;
    return this.chatSessionService.updateChatSessionTitle(
      userId,
      sessionId,
      data,
    );
  }

  /**
   * 获取会话的消息列表
   * GET /api/chat/sessions/:sessionId/messages
   */
  @Get(":sessionId/messages")
  async getMessages(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
    @Query() query: GetMessagesQuery,
  ): Promise<PaginatedResponse<ChatMessageDto>> {
    const userId = req.user.id;
    return this.chatSessionService.getMessages(userId, sessionId, query);
  }

  /**
   * 发送消息（支持流式响应）
   * POST /api/chat/sessions/:sessionId/messages
   */
  @Sse(":sessionId/messages", { method: RequestMethod.POST })
  async sendMessage(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
    @Body() data: SendMessageDto,
  ): Promise<Observable<ServerSentEvent>> {
    const userId = req.user.id;

    // 创建一个Subject来发送SSE事件
    const subject = new Subject<ServerSentEvent>();

    try {
      // 发送用户消息并准备生成助手回复
      const { userMessage, generateAssistantResponse } =
        await this.chatSessionService.sendMessage(userId, sessionId, data);

      // 发送用户消息事件
      subject.next({
        data: {
          type: "user_message",
          payload: userMessage,
        },
      });

      // 流式生成并发送助手回复
      await generateAssistantResponse((chunk) => {
        subject.next({
          data: {
            type: "assistant_chunk",
            payload: { content: chunk },
          },
        });
        return Promise.resolve();
      });

      // 发送完成事件
      subject.next({
        data: {
          type: "done",
          payload: { status: "completed" },
        },
      });

      subject.complete();
    } catch (error) {
      // 发送错误事件
      subject.next({
        data: {
          type: "error",
          payload: { message: (error as Error).message },
        },
      });
      subject.complete();
    }

    return subject.asObservable();
  }
}
