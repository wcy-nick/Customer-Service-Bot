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
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ChatSessionService } from "./chat-session.service";
import type {
  ChatSessionDto,
  ChatSessionDetailDto,
  CreateChatSessionDto,
  GetChatSessionsQuery,
  PaginatedResponse,
  UpdateChatSessionTitleDto,
} from "./types/chat-session";

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
}
