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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import {
  type ChatSessionDto,
  type ChatSessionDetailDto,
  type CreateChatSessionDto,
  type GetChatSessionsQuery,
  type PaginatedResponse,
  type UpdateChatSessionTitleDto,
  type GetMessagesQuery,
  type SendMessageDto,
  type ChatMessageDto,
  ModelName,
} from "./types/chat-session";
import { Observable, Subject } from "rxjs";

// 自定义MessageEvent接口
export interface ServerSentEvent<T = any> {
  data: T;
}

@ApiTags("chat-sessions")
@Controller("api/chat/sessions")
@UseGuards(AuthGuard("jwt"))
export class ChatSessionController {
  constructor(private readonly chatSessionService: ChatSessionService) {}

  /**
   * 获取聊天会话列表（带分页）
   * GET /api/chat/sessions
   */
  @ApiOperation({ summary: "获取聊天会话列表（带分页）" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "页码",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "每页数量",
  })
  @ApiResponse({
    status: 200,
    description: "聊天会话列表（带分页）",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "会话ID" },
              title: { type: "string", description: "会话标题" },
              business_category_id: {
                type: "string",
                description: "业务分类ID",
              },
              scenario_category_id: {
                type: "string",
                description: "场景分类ID",
              },
              message_count: { type: "number", description: "消息数量" },
              last_message_at: {
                type: "string",
                format: "date-time",
                description: "最后消息时间",
              },
              created_at: {
                type: "string",
                format: "date-time",
                description: "创建时间",
              },
            },
          },
        },
        total: { type: "number", description: "总数量" },
        page: { type: "number", description: "当前页码" },
        limit: { type: "number", description: "每页数量" },
        total_pages: { type: "number", description: "总页数" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
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
  @ApiOperation({ summary: "创建新的聊天会话" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "会话标题" },
        business_category_id: { type: "string", description: "业务分类ID" },
        scenario_category_id: { type: "string", description: "场景分类ID" },
      },
      required: ["title", "business_category_id"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "创建的聊天会话",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "会话ID" },
        title: { type: "string", description: "会话标题" },
        business_category_id: { type: "string", description: "业务分类ID" },
        scenario_category_id: { type: "string", description: "场景分类ID" },
        message_count: { type: "number", description: "消息数量" },
        last_message_at: {
          type: "string",
          format: "date-time",
          description: "最后消息时间",
        },
        created_at: {
          type: "string",
          format: "date-time",
          description: "创建时间",
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "无效的请求参数" })
  @ApiResponse({ status: 401, description: "未授权" })
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
  @ApiOperation({ summary: "获取聊天会话详情" })
  @ApiParam({ name: "sessionId", type: String, description: "会话ID" })
  @ApiResponse({
    status: 200,
    description: "聊天会话详情",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "会话ID" },
        title: { type: "string", description: "会话标题" },
        business_category_id: { type: "string", description: "业务分类ID" },
        scenario_category_id: { type: "string", description: "场景分类ID" },
        message_count: { type: "number", description: "消息数量" },
        last_message_at: {
          type: "string",
          format: "date-time",
          description: "最后消息时间",
        },
        created_at: {
          type: "string",
          format: "date-time",
          description: "创建时间",
        },
        updated_at: {
          type: "string",
          format: "date-time",
          description: "更新时间",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权访问该会话" })
  @ApiResponse({ status: 404, description: "会话不存在" })
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
  @ApiOperation({ summary: "删除聊天会话" })
  @ApiParam({ name: "sessionId", type: String, description: "会话ID" })
  @ApiResponse({
    status: 200,
    description: "删除成功",
    schema: { type: "object", properties: { status: { type: "string" } } },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权访问该会话" })
  @ApiResponse({ status: 404, description: "会话不存在" })
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
  @ApiOperation({ summary: "更新聊天会话标题" })
  @ApiParam({ name: "sessionId", type: String, description: "会话ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "新的会话标题" },
      },
      required: ["title"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "更新后的聊天会话",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "会话ID" },
        title: { type: "string", description: "会话标题" },
        business_category_id: { type: "string", description: "业务分类ID" },
        scenario_category_id: { type: "string", description: "场景分类ID" },
        message_count: { type: "number", description: "消息数量" },
        last_message_at: {
          type: "string",
          format: "date-time",
          description: "最后消息时间",
        },
        created_at: {
          type: "string",
          format: "date-time",
          description: "创建时间",
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "无效的请求参数" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权访问该会话" })
  @ApiResponse({ status: 404, description: "会话不存在" })
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
  @ApiOperation({ summary: "获取会话的消息列表" })
  @ApiParam({ name: "sessionId", type: String, description: "会话ID" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "页码",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "每页数量",
  })
  @ApiResponse({
    status: 200,
    description: "消息列表（带分页）",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "消息ID" },
              session_id: { type: "string", description: "会话ID" },
              user_id: { type: "string", description: "用户ID" },
              content: { type: "string", description: "消息内容" },
              role: {
                type: "string",
                description: "消息角色（user或assistant）",
              },
              created_at: {
                type: "string",
                format: "date-time",
                description: "创建时间",
              },
            },
          },
        },
        total: { type: "number", description: "总数量" },
        page: { type: "number", description: "当前页码" },
        limit: { type: "number", description: "每页数量" },
        total_pages: { type: "number", description: "总页数" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权访问该会话" })
  @ApiResponse({ status: 404, description: "会话不存在" })
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
  @ApiOperation({ summary: "发送消息（支持流式响应）" })
  @ApiParam({ name: "sessionId", type: String, description: "会话ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "消息内容" },
        model: {
          type: "string",
          description: `模型名称，${ModelName.GLM4}更小更快(默认选项)，${ModelName.GLM4_5}更强更慢`,
        },
        path: {
          type: "string",
          description: "指定根据某些文档回答问题，抖音官网文档的path",
        },
      },
      required: ["content"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "流式响应的消息",
    schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "事件类型" },
        payload: { type: "object", description: "事件数据" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "无效的请求参数" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权访问该会话" })
  @ApiResponse({ status: 404, description: "会话不存在" })
  @Sse(":sessionId/messages", { method: RequestMethod.POST })
  sendMessage(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
    @Body() data: SendMessageDto,
  ): Observable<ServerSentEvent> {
    const userId = req.user.id;

    // 创建一个Subject来发送SSE事件
    const subject = new Subject<ServerSentEvent>();

    /**
     * 为什么 sendMessage 已经是 async 还要再包一层 IIFE？千万不能await该IIFE
     * ------------------------------------------------
     * 1. SSE 靠 Observable 驱动：Nest 在方法返回那一刻就会订阅 Observable，
     *    订阅成功后才开始向客户端吐事件。
     * 2. async 函数一旦遇到 await 会“暂停”，在暂停期间尚未返回 Observable，
     *    导致 Nest 根本来不及订阅，后续事件就丢失了。
     * 3. 把真正的异步逻辑放进 IIFE，让主函数同步地立刻把 Observable 抛出去，
     *    Nest 立即订阅，IIFE 里再慢慢 await，事件就能稳稳地流进已建立的通道。
     * 4. 结果：user_message → 若干 assistant_chunk → done/error 全程不丢包。
     */
    (async () => {
      const response = this.chatSessionService.sendMessage(
        userId,
        sessionId,
        data,
      );

      // 流式获取助手回复
      for await (const chunk of response) {
        const data =
          chunk === "ErrorGenerating"
            ? {
                type: "error",
                payload: { content: "抱歉，生成失败，请稍后重试" },
              }
            : {
                type: "chunk",
                payload: { content: chunk },
              };

        subject.next({
          data,
        });
      }

      // 发送完成事件
      subject.next({
        data: {
          type: "done",
          payload: {},
        },
      });

      subject.complete();
    })();

    return subject.asObservable();
  }
}
