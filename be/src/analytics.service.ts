import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import {
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
import { Prisma } from "@prisma/client";

interface Activity {
  id: string;
  userId: string;
  type: "message" | "session" | "document_view" | "feedback";
  createdAt: Date;
  description: string;
  relatedId?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 获取仪表盘概览数据
   * @param query 查询参数
   * @returns 仪表盘概览数据
   */
  async getDashboardOverview(
    query: DashboardQuery,
  ): Promise<DashboardOverviewDto> {
    const { start_date, end_date } = query;

    // 构建日期过滤条件
    const whereClause = this.buildDateFilter(start_date, end_date);

    // 获取总会话数
    const total_sessions = await this.prismaService.client.chatSession.count({
      where: { ...whereClause, isActive: true },
    });

    // 获取总消息数
    const total_messages = await this.prismaService.client.chatMessage.count({
      where: { ...whereClause },
    });

    // 获取总用户数
    const total_users = await this.prismaService.client.user.count({
      where: { isActive: true },
    });

    // 获取平均会话时长（这里简化处理，实际可能需要更复杂的计算）
    const average_session_duration = 120; // 示例值，单位秒

    // 获取满意度评分
    const feedbacks = await this.prismaService.client.messageFeedback.findMany({
      where: { ...whereClause, rating: { not: null } },
      select: { rating: true },
    });
    const satisfaction_score =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) /
          feedbacks.length
        : 0;

    // 获取趋势数据（这里简化处理）
    const trend_data = [
      { date: "2024-01-01", sessions: 10, messages: 50 },
      { date: "2024-01-02", sessions: 15, messages: 75 },
      { date: "2024-01-03", sessions: 20, messages: 100 },
    ];

    return {
      total_sessions,
      total_messages,
      total_users,
      average_session_duration,
      satisfaction_score,
      trend_data,
    };
  }

  /**
   * 获取知识热图数据
   * @param query 查询参数
   * @returns 知识热图数据
   */
  async getKnowledgeHeatmap(
    query: KnowledgeHeatmapQuery,
  ): Promise<KnowledgeHeatmapItemDto[]> {
    const { start_date, end_date, limit = 10 } = query;

    // 构建日期过滤条件
    const whereClause = this.buildDateFilter(start_date, end_date);

    // 获取知识热图数据
    const heatmapItems =
      await this.prismaService.client.knowledgeHeatmap.findMany({
        where: whereClause,
        include: {
          document: {
            include: {
              businessCategory: true,
            },
          },
        },
        orderBy: {
          referenceCount: "desc",
        },
        take: limit,
      });

    // 转换为DTO
    return heatmapItems.map((item) => ({
      knowledge_id: item.documentId,
      knowledge_title: item.document.title,
      business_category_id: item.document.businessCategoryId || "",
      business_category_name: item.document.businessCategory?.name || "",
      access_count: item.viewCount,
      relevance_score: 0.8, // 示例值
      last_accessed: item.createdAt,
    }));
  }

  /**
   * 获取常见问题数据
   * @param query 查询参数
   * @returns 常见问题数据
   */
  async getFrequentQuestions(
    query: FrequentQuestionsQuery,
  ): Promise<FrequentQuestionDto[]> {
    const { start_date, end_date, limit = 10 } = query;

    // 构建日期过滤条件
    const whereClause = this.buildDateFilter(start_date, end_date);

    // 获取常见问题数据
    const frequentQuestions =
      await this.prismaService.client.frequentQuestion.findMany({
        where: whereClause,
        orderBy: {
          askCount: "desc",
        },
        take: limit,
      });

    // 转换为DTO
    return frequentQuestions.map((item) => ({
      question: item.questionPattern,
      frequency: item.askCount,
      first_occurrence: item.firstAskedAt || item.createdAt,
      last_occurrence: item.lastAskedAt || item.createdAt,
    }));
  }

  async updateFrequentQuestions(question: string): Promise<void> {
    // 将问题添加到高频问题统计中
    const existingFrequentQuestion =
      await this.prismaService.client.frequentQuestion.findFirst({
        where: {
          questionPattern: question,
        },
      });

    if (existingFrequentQuestion) {
      // 更新已有高频问题的统计信息
      await this.prismaService.client.frequentQuestion.update({
        where: {
          id: existingFrequentQuestion.id,
        },
        data: {
          askCount: existingFrequentQuestion.askCount + 1,
          lastAskedAt: new Date(),
        },
      });
    } else {
      // 添加新的高频问题
      await this.prismaService.client.frequentQuestion.create({
        data: {
          questionPattern: question,
          askCount: 1,
          uniqueUsers: 1,
          firstAskedAt: new Date(),
          lastAskedAt: new Date(),
        },
      });
    }
  }

  /**
   * 获取未回答问题数据
   * @param query 查询参数
   * @returns 未回答问题数据（分页）
   */
  async getUnansweredQuestions(
    query: UnansweredQuestionsQuery,
  ): Promise<PaginatedResponse<UnansweredQuestionDto>> {
    const { start_date, end_date, is_resolved, page = 1, limit = 10 } = query;

    // 构建日期过滤条件
    const whereClause = this.buildDateFilter(start_date, end_date);

    // 构建查询条件
    const questionWhereClause = {
      ...whereClause,
      isResolved: is_resolved,
    };

    // 获取总数
    const total = await this.prismaService.client.unansweredQuestion.count({
      where: questionWhereClause,
    });

    // 获取分页数据
    const questions =
      await this.prismaService.client.unansweredQuestion.findMany({
        where: questionWhereClause,
        include: {
          resolver: true,
        },
        orderBy: {
          lastAskedAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      });

    // 转换为DTO
    const data = questions.map((question) => ({
      id: question.id,
      question: question.questionText,
      ask_count: question.askCount,
      created_at: question.firstAskedAt,
      updated_at: question.lastAskedAt,
      is_resolved: question.isResolved,
      resolved_at: question.resolvedAt || undefined,
      resolved_by: question.resolver?.username || undefined,
      related_document_id: undefined,
      related_document_title: undefined,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
  async updateUnansweredQuestions(question: string): Promise<void> {
    // 检查问题是否已经存在于未回答问题表中
    const existingQuestion =
      await this.prismaService.client.unansweredQuestion.findFirst({
        where: {
          questionText: question,
        },
      });

    if (existingQuestion) {
      // 更新已有问题的询问次数和最后询问时间
      await this.prismaService.client.unansweredQuestion.update({
        where: {
          id: existingQuestion.id,
        },
        data: {
          askCount: existingQuestion.askCount + 1,
          lastAskedAt: new Date(),
        },
      });
    } else {
      // 添加新的未回答问题
      await this.prismaService.client.unansweredQuestion.create({
        data: {
          questionText: question,
        },
      });
    }
  }

  /**
   * 解决未回答问题
   * @param id 问题ID
   * @param input 解决问题的输入参数
   * @param userId 操作用户ID
   * @returns 更新后的未回答问题
   */
  async getUsageTrends(query: UsageTrendsQuery): Promise<UsageTrendDto[]> {
    try {
      const { start_date, end_date, metric, group_by } = query;
      const whereClause = this.buildDateFilter(start_date, end_date);

      // 根据不同的指标类型查询数据
      let trends: UsageTrendDto[] = [];

      switch (metric) {
        case "sessions": {
          // 查询会话数据
          const sessions = await this.prismaService.client.chatSession.findMany(
            {
              where: whereClause,
              select: {
                createdAt: true,
              },
            },
          );
          // 按时间分组统计
          trends = this.groupByDate(
            sessions,
            "createdAt",
            group_by,
            "sessions",
          );
          break;
        }
        case "messages": {
          // 查询消息数据
          const messages = await this.prismaService.client.chatMessage.findMany(
            {
              where: whereClause,
              select: {
                createdAt: true,
              },
            },
          );
          trends = this.groupByDate(
            messages,
            "createdAt",
            group_by,
            "messages",
          );
          break;
        }
        case "documents_viewed": {
          // 查询文档访问数据
          const views =
            await this.prismaService.client.knowledgeHeatmap.findMany({
              where: whereClause,
              select: {
                createdAt: true,
              },
            });
          trends = this.groupByDate(
            views,
            "createdAt",
            group_by,
            "documents_viewed",
          );
          break;
        }
        case "user_satisfaction": {
          // 查询用户满意度数据
          const feedbacks =
            await this.prismaService.client.messageFeedback.findMany({
              where: { ...whereClause, rating: { not: null } },
              select: {
                createdAt: true,
                rating: true,
              },
            });
          // 按时间分组计算平均评分
          trends = this.groupByDateWithAverage(
            feedbacks,
            "createdAt",
            "rating",
            group_by,
            "user_satisfaction",
          );
          break;
        }
        default:
          throw new Error("Invalid metric type");
      }

      return trends;
    } catch (error) {
      console.error("Error in getUsageTrends:", error);
      throw new Error("Failed to get usage trends");
    }
  }

  getUserActivity(
    query: UserActivityQuery,
  ): PaginatedResponse<UserActivityDto> {
    const { start_date, end_date, page = 1, limit = 20 } = query;
    this.buildDateFilter(start_date, end_date);

    // 获取总数
    // 这里需要根据不同的活动类型分别统计，简化处理
    const total = 100; // 示例值，实际需要查询数据库

    // 获取分页数据
    // 这里需要查询多个表的数据并合并，简化处理返回模拟数据
    const activities: Activity[] = [];

    // 转换为DTO
    const data = activities.map((activity) => ({
      id: activity.id,
      user_id: activity.userId,
      user_name: "", // 示例值，实际需要关联用户
      type: activity.type,
      description: activity.description,
      timestamp: activity.createdAt,
      related_id: activity.relatedId,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async resolveUnansweredQuestion(
    id: string,
    input: ResolveUnansweredQuestionInput,
    userId: string,
  ): Promise<UnansweredQuestionDto> {
    // 检查问题是否存在
    const question =
      await this.prismaService.client.unansweredQuestion.findUnique({
        where: { id },
      });

    if (!question) {
      throw new NotFoundException("Unanswered question not found");
    }

    // 更新问题状态
    const updatedQuestion =
      await this.prismaService.client.unansweredQuestion.update({
        where: { id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: userId,
          // 这里可以添加关联文档的逻辑
        },
        include: {
          resolver: true,
        },
      });

    // 转换为DTO
    return {
      id: updatedQuestion.id,
      question: updatedQuestion.questionText,
      ask_count: updatedQuestion.askCount,
      created_at: updatedQuestion.firstAskedAt,
      updated_at: updatedQuestion.lastAskedAt,
      is_resolved: updatedQuestion.isResolved,
      resolved_at: updatedQuestion.resolvedAt || undefined,
      resolved_by: updatedQuestion.resolver?.username || undefined,
      related_document_id: input.document_id,
      related_document_title: undefined, // 可以通过document_id查询获取
    };
  }

  /**
   * 构建日期过滤条件
   * @param start_date 开始日期
   * @param end_date 结束日期
   * @returns 日期过滤条件
   */
  private buildDateFilter(start_date?: string, end_date?: string) {
    const whereClause: { createdAt?: Prisma.DateTimeFilter } = {};

    if (start_date) {
      whereClause.createdAt = { gte: new Date(start_date) };
    }

    if (end_date) {
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999); // 设置为当天的最后一刻
      whereClause.createdAt = { ...whereClause.createdAt, lte: endDate };
    }

    return whereClause;
  }

  // 辅助方法：按日期分组统计数量
  private groupByDate(
    items: { createdAt: Date }[],
    dateField: "createdAt",
    groupBy: "day" | "week" | "month",
    metric: string,
  ): UsageTrendDto[] {
    const groups: { [key: string]: number } = {};

    items.forEach((item) => {
      const date = new Date(item[dateField]);
      let key: string;

      switch (groupBy) {
        case "day": {
          key = date.toISOString().split("T")[0];
          break;
        }
        case "week": {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
          break;
        }
        case "month": {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
          break;
        }
      }

      groups[key] = (groups[key] || 0) + 1;
    });

    return Object.entries(groups).map(([date, value]) => ({
      date,
      value,
      metric,
    }));
  }

  // 辅助方法：按日期分组计算平均值
  private groupByDateWithAverage(
    items: { createdAt: Date; rating: number | null }[],
    dateField: "createdAt",
    valueField: "rating",
    groupBy: "day" | "week" | "month",
    metric: string,
  ): UsageTrendDto[] {
    const groups: { [key: string]: { total: number; count: number } } = {};

    items.forEach((item) => {
      const date = new Date(item[dateField]);
      let key: string;

      switch (groupBy) {
        case "day": {
          key = date.toISOString().split("T")[0];
          break;
        }
        case "week": {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
          break;
        }
        case "month": {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
          break;
        }
      }

      if (!groups[key]) {
        groups[key] = { total: 0, count: 0 };
      }

      groups[key].total += item[valueField] || 0;
      groups[key].count += 1;
    });

    return Object.entries(groups).map(([date, { total, count }]) => ({
      date,
      value: count > 0 ? total / count : 0,
      metric,
    }));
  }
}
