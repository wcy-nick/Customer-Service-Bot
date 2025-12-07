import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import type {
  DashboardOverviewDto,
  KnowledgeHeatmapItemDto,
  FrequentQuestionDto,
  UnansweredQuestionDto,
  ResolveUnansweredQuestionInput,
  DashboardQuery,
  KnowledgeHeatmapQuery,
  FrequentQuestionsQuery,
  UnansweredQuestionsQuery,
  PaginatedResponse,
  UsageTrendsQuery,
  UsageTrendDto,
  UserActivityQuery,
  UserActivityDto,
} from "./types/types";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";

@ApiTags("analytics")
@Controller("api/analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 获取仪表盘概览数据
   * @param query 查询参数
   * @returns 仪表盘概览数据
   */
  @ApiOperation({ summary: "获取仪表盘概览数据" })
  @ApiQuery({
    name: "start_date",
    required: false,
    type: String,
    description: "开始日期",
  })
  @ApiQuery({
    name: "end_date",
    required: false,
    type: String,
    description: "结束日期",
  })
  @ApiResponse({
    status: 200,
    description: "仪表盘概览数据",
    schema: {
      type: "object",
      properties: {
        total_sessions: { type: "number", description: "总会话数" },
        total_messages: { type: "number", description: "总消息数" },
        total_users: { type: "number", description: "总用户数" },
        avg_session_duration: { type: "number", description: "平均会话时长" },
        avg_response_time: { type: "number", description: "平均响应时间" },
        satisfaction_rate: { type: "number", description: "满意度评分" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Get("dashboard/overview")
  async getDashboardOverview(
    @Query() query: DashboardQuery,
  ): Promise<DashboardOverviewDto> {
    return this.analyticsService.getDashboardOverview(query);
  }

  /**
   * 获取知识热图数据
   * @param query 查询参数
   * @returns 知识热图数据
   */
  @ApiOperation({ summary: "获取知识热图数据" })
  @ApiQuery({
    name: "start_date",
    required: false,
    type: String,
    description: "开始日期",
  })
  @ApiQuery({
    name: "end_date",
    required: false,
    type: String,
    description: "结束日期",
  })
  @ApiQuery({
    name: "business_category_id",
    required: false,
    type: String,
    description: "业务分类ID",
  })
  @ApiResponse({
    status: 200,
    description: "知识热图数据",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          knowledge_id: { type: "string", description: "知识库ID" },
          title: { type: "string", description: "知识库标题" },
          access_count: { type: "number", description: "访问次数" },
          business_category_id: { type: "string", description: "业务分类ID" },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Get("knowledge-heatmap")
  async getKnowledgeHeatmap(
    @Query() query: KnowledgeHeatmapQuery,
  ): Promise<KnowledgeHeatmapItemDto[]> {
    return this.analyticsService.getKnowledgeHeatmap(query);
  }

  /**
   * 获取常见问题数据
   * @param query 查询参数
   * @returns 常见问题数据
   */
  @ApiOperation({ summary: "获取常见问题数据" })
  @ApiQuery({
    name: "start_date",
    required: false,
    type: String,
    description: "开始日期",
  })
  @ApiQuery({
    name: "end_date",
    required: false,
    type: String,
    description: "结束日期",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量限制",
  })
  @ApiResponse({
    status: 200,
    description: "常见问题数据",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "问题内容" },
          frequency: { type: "number", description: "出现频率" },
          answer_rate: { type: "number", description: "回答率" },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Get("frequent-questions")
  async getFrequentQuestions(
    @Query() query: FrequentQuestionsQuery,
  ): Promise<FrequentQuestionDto[]> {
    return this.analyticsService.getFrequentQuestions(query);
  }

  /**
   * 获取未回答问题数据
   * @param query 查询参数
   * @returns 未回答问题数据（分页）
   */
  @ApiOperation({ summary: "获取未回答问题数据" })
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
  @ApiQuery({
    name: "start_date",
    required: false,
    type: String,
    description: "开始日期",
  })
  @ApiQuery({
    name: "end_date",
    required: false,
    type: String,
    description: "结束日期",
  })
  @ApiResponse({
    status: 200,
    description: "未回答问题数据（分页）",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "问题ID" },
              question: { type: "string", description: "问题内容" },
              ask_count: { type: "number", description: "问题被询问的次数" },
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
              is_resolved: { type: "boolean", description: "问题是否已解决" },
              resolved_at: {
                type: "string",
                format: "date-time",
                description: "问题解决时间",
              },
              resolved_by: { type: "string", description: "解决问题的人" },
              related_document_id: {
                type: "string",
                description: "相关文档ID",
              },
              related_document_title: {
                type: "string",
                description: "相关文档标题",
              },
            },
          },
        },
        meta: {
          type: "object",
          properties: {
            total: { type: "number", description: "总数量" },
            page: { type: "number", description: "当前页码" },
            limit: { type: "number", description: "每页数量" },
            total_pages: { type: "number", description: "总页数" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Get("unanswered-questions")
  async getUnansweredQuestions(
    @Query() query: UnansweredQuestionsQuery,
  ): Promise<PaginatedResponse<UnansweredQuestionDto>> {
    return this.analyticsService.getUnansweredQuestions(query);
  }

  /**
   * 获取使用趋势数据
   * @param query 查询参数
   * @returns 使用趋势数据
   */
  @ApiOperation({ summary: "获取使用趋势数据" })
  @ApiQuery({
    name: "start_date",
    required: true,
    type: String,
    description: "开始日期",
  })
  @ApiQuery({
    name: "end_date",
    required: true,
    type: String,
    description: "结束日期",
  })
  @ApiQuery({
    name: "metric",
    required: false,
    type: String,
    description: "指标类型",
    enum: ["sessions", "messages", "documents_viewed", "user_satisfaction"],
  })
  @ApiQuery({
    name: "group_by",
    required: false,
    type: String,
    description: "时间分组",
    enum: ["day", "week", "month"],
  })
  @ApiResponse({
    status: 200,
    description: "使用趋势数据",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", format: "date-time", description: "日期" },
          sessions_count: { type: "number", description: "会话数" },
          messages_count: { type: "number", description: "消息数" },
          users_count: { type: "number", description: "用户数" },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @Get("usage-trends")
  async getUsageTrends(
    @Query() query: UsageTrendsQuery,
  ): Promise<UsageTrendDto[]> {
    if (!query.metric) {
      query.metric = "sessions";
    }
    if (
      ![
        "sessions",
        "messages",
        "documents_viewed",
        "user_satisfaction",
      ].includes(query.metric)
    ) {
      throw new BadRequestException("未知的metric类型");
    }
    if (!query.group_by) {
      query.group_by = "day";
    }
    if (!["day", "week", "month"].includes(query.group_by)) {
      throw new BadRequestException("未知的group_by类型");
    }
    return this.analyticsService.getUsageTrends(query);
  }

  /**
   * 获取用户活动数据
   * @param query 查询参数
   * @returns 用户活动数据（分页）
   */
  @ApiOperation({ summary: "获取用户活动数据" })
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
  @ApiQuery({
    name: "user_id",
    required: false,
    type: String,
    description: "用户ID",
  })
  @ApiResponse({
    status: 200,
    description: "用户活动数据（分页）",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "活动ID" },
              user_id: { type: "string", description: "用户ID" },
              action: { type: "string", description: "活动类型" },
              resource_type: { type: "string", description: "资源类型" },
              resource_id: { type: "string", description: "资源ID" },
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
  @ApiResponse({ status: 403, description: "权限不足" })
  @Get("user-activity")
  getUserActivity(
    @Query() query: UserActivityQuery,
  ): PaginatedResponse<UserActivityDto> {
    return this.analyticsService.getUserActivity(query);
  }

  /**
   * 解决未回答问题
   * @param id 问题ID
   * @param input 解决问题的输入参数
   * @returns 更新后的未回答问题
   */
  @ApiOperation({ summary: "解决未回答问题" })
  @ApiParam({ name: "id", type: String, description: "问题ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        answer: { type: "string", description: "回答内容" },
        knowledge_id: { type: "string", description: "关联知识库ID" },
      },
      required: ["answer"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "更新后的未回答问题",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "问题ID" },
        question: { type: "string", description: "问题内容" },
        answer: { type: "string", description: "回答内容" },
        knowledge_id: { type: "string", description: "关联知识库ID" },
        resolved_at: {
          type: "string",
          format: "date-time",
          description: "解决时间",
        },
        resolved_by: { type: "string", description: "解决人ID" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @ApiResponse({ status: 404, description: "问题不存在" })
  @Post("unanswered-questions/:id/resolve")
  async resolveUnansweredQuestion(
    @Param("id") id: string,
    @Body() input: ResolveUnansweredQuestionInput,
  ): Promise<UnansweredQuestionDto> {
    // 从请求中获取用户ID（实际应用中可能需要从auth guard中获取）
    const userId = "user-123"; // 示例值
    return this.analyticsService.resolveUnansweredQuestion(id, input, userId);
  }
}
