import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import {
  SyncJobsQuery,
  SyncJobDetailDto,
  DouyinKnowledgeSyncInput,
  SyncJobResponse,
  PaginatedResponse,
} from "./types/types";
import { Prisma } from "@prisma/client";
import Bottleneck from "bottleneck";
import fs from "fs/promises";
import { sanitizeWindowsPath } from "./utils/pathUtils.js";

interface Article {
  content: object;
  name: string;
  update_timestamp: number;
}

interface Response<T> {
  data: T;
}

type ArticleResponse = Response<{
  article_info: { content: string; name: string; update_timestamp: number };
}>;

type MenuResponse = Response<{
  articles: { id: string }[];
}>;

@Injectable()
export class SyncService {
  private readonly baseURL: string =
    "https://school.jinritemai.com/api/eschool/v2/library";
  private readonly outputDir: string = "articles";
  private readonly merchantID: string = "11593";
  private readonly limiter: Bottleneck;

  constructor(private readonly prismaService: PrismaService) {
    this.limiter = new Bottleneck({
      maxConcurrent: 30,
      minTime: 50,
    });
  }

  /**
   * 获取同步作业列表
   * @param query 查询参数
   * @returns 分页的同步作业列表
   */
  async getSyncJobs(query: SyncJobsQuery): Promise<PaginatedResponse<any>> {
    const { source_type, status, page = 1, limit = 10 } = query;

    const where: Prisma.DataSourceSyncWhereInput = {};

    if (source_type) {
      where.sourceType = source_type;
    }

    if (status) {
      where.status = status;
    }

    const total = await this.prismaService.client.dataSourceSync.count({
      where,
    });
    const data = await this.prismaService.client.dataSourceSync.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

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

  /**
   * 获取同步作业详情
   * @param jobId 作业ID
   * @returns 同步作业详情
   */
  async getSyncJobDetail(jobId: string): Promise<SyncJobDetailDto | null> {
    const job = await this.prismaService.client.dataSourceSync.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    // 获取相关的作业队列日志
    const logs = await this.prismaService.client.jobQueue.findMany({
      where: {
        queueName: `sync_${jobId}`,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, status: true, errorMessage: true, createdAt: true },
    });

    return {
      id: job.id,
      source_type: job.sourceType,
      status: job.status,
      sync_type: job.syncType as "full" | "incremental",
      job_type: "douyin-knowledge",
      created_at: job.createdAt,
      started_at: job.startedAt || undefined,
      completed_at: job.completedAt || undefined,
      progress:
        job.itemsTotal > 0
          ? Math.round((job.itemsProcessed / job.itemsTotal) * 100)
          : 0,
      total_items: job.itemsTotal,
      processed_items: job.itemsProcessed,
      logs: logs.map(
        (log) =>
          `${log.createdAt.toISOString()}: ${log.status} ${log.errorMessage || ""}`,
      ),
      error_message: job.errorMessage || undefined,
    };
  }

  /**
   * 触发抖音知识同步
   * @param input 同步输入参数
   * @returns 同步作业响应
   */
  async syncDouyinKnowledge(
    input: DouyinKnowledgeSyncInput,
  ): Promise<SyncJobResponse> {
    // 创建同步作业记录
    const syncJob = await this.prismaService.client.dataSourceSync.create({
      data: {
        sourceType: "douyin-knowledge",
        syncType: input.sync_type,
        status: "pending",
      },
    });

    // 异步执行同步任务
    this.executeDouyinSync(syncJob.id).catch(async (error: Error) => {
      // 更新作业状态为失败
      await this.prismaService.client.dataSourceSync.update({
        where: { id: syncJob.id },
        data: {
          status: "failed",
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
    });

    return {
      job_id: syncJob.id,
      status: "pending",
    };
  }

  /**
   * 执行抖音知识同步
   * @param jobId 作业ID
   * @param _input 同步输入参数
   */
  private async executeDouyinSync(jobId: string): Promise<void> {
    // 更新作业状态为开始
    await this.prismaService.client.dataSourceSync.update({
      where: { id: jobId },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    try {
      // 获取文章列表
      const menu = await this.fetchMerchantMenu();
      const articleIds = this.parseMenu(menu);

      // 更新总任务数
      await this.prismaService.client.dataSourceSync.update({
        where: { id: jobId },
        data: {
          itemsTotal: articleIds.length,
        },
      });

      let processedCount = 0;

      // 创建作业队列
      await Promise.all(
        articleIds.map(async (id) => {
          await this.limiter.schedule(async () => {
            // 创建作业任务
            await this.prismaService.client.jobQueue.create({
              data: {
                queueName: `sync_${jobId}`,
                jobName: `sync_article_${id}`,
                payload: { articleId: id },
                status: "waiting",
              },
            });

            // 执行文章同步
            const json = await this.fetchArticle(id);
            const article = this.parseArticle(json);
            await this.saveArticleJSON(article);

            // 更新处理计数
            processedCount++;
            await this.prismaService.client.dataSourceSync.update({
              where: { id: jobId },
              data: {
                itemsProcessed: processedCount,
              },
            });

            // 更新作业任务状态
            await this.prismaService.client.jobQueue.updateMany({
              where: {
                queueName: `sync_${jobId}`,
                jobName: `sync_article_${id}`,
              },
              data: {
                status: "completed",
                finishedAt: new Date(),
              },
            });
          });
        }),
      );

      // 更新作业状态为完成
      await this.prismaService.client.dataSourceSync.update({
        where: { id: jobId },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });
    } catch (error) {
      // 更新作业状态为失败
      await this.prismaService.client.dataSourceSync.update({
        where: { id: jobId },
        data: {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });

      // 记录错误到作业队列
      await this.prismaService.client.jobQueue.create({
        data: {
          queueName: `sync_${jobId}`,
          jobName: "sync_error",
          payload: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          finishedAt: new Date(),
        },
      });
    }
  }

  /**
   * 取消同步作业
   * @param jobId 作业ID
   * @returns 是否取消成功
   */
  async cancelSyncJob(jobId: string): Promise<boolean> {
    const job = await this.prismaService.client.dataSourceSync.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status === "completed" || job.status === "failed") {
      return false;
    }

    // 更新作业状态为取消
    await this.prismaService.client.dataSourceSync.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
        completedAt: new Date(),
      },
    });

    // 更新相关作业队列状态
    await this.prismaService.client.jobQueue.updateMany({
      where: {
        queueName: `sync_${jobId}`,
        status: "waiting",
      },
      data: {
        status: "cancelled",
        finishedAt: new Date(),
      },
    });

    return true;
  }

  private async fetchData<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json() as Promise<T>;
  }

  private async fetchMenu(node_id: string): Promise<MenuResponse> {
    const url = `${this.baseURL}/article/list?node_id=${node_id}&page_size=1000`;
    return this.fetchData(url);
  }

  public async fetchMerchantMenu(): Promise<MenuResponse> {
    return this.fetchMenu(this.merchantID);
  }

  public async fetchArticle(id: string): Promise<ArticleResponse> {
    const url = `${this.baseURL}/article/detail?id=${id}`;
    return this.fetchData(url);
  }

  public parseMenu(json: MenuResponse): string[] {
    const {
      data: { articles },
    } = json;
    return articles.map((item: { id: string }) => item.id);
  }

  public parseArticle(json: ArticleResponse): Article {
    const {
      data: {
        article_info: { content, name, update_timestamp },
      },
    } = json;
    return { content: JSON.parse(content) as object, name, update_timestamp };
  }

  private async saveJSON(data: object, filePath: string): Promise<void> {
    return fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  public async saveArticleJSON(article: Article): Promise<void> {
    const sanitizedName = sanitizeWindowsPath(article.name);
    await fs.mkdir(this.outputDir, { recursive: true });
    return this.saveJSON(
      article.content,
      `${this.outputDir}/${sanitizedName}-${article.update_timestamp}.json`,
    );
  }
}
