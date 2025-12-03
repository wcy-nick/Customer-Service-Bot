import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  UseGuards,
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
import { AuthGuard } from "./auth.guard";

@Controller("api/analytics")
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 获取仪表盘概览数据
   * @param query 查询参数
   * @returns 仪表盘概览数据
   */
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
  @Get("usage-trends")
  async getUsageTrends(
    @Query() query: UsageTrendsQuery,
  ): Promise<UsageTrendDto[]> {
    return this.analyticsService.getUsageTrends(query);
  }

  /**
   * 获取用户活动数据
   * @param query 查询参数
   * @returns 用户活动数据（分页）
   */
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
