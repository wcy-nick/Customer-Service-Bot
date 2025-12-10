import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import {
  SyncJobsQuery,
  SyncJobDetailDto,
  PaginatedResponse,
  SyncMode,
} from "./types/types";
import { Prisma } from "@prisma/client";
import Bottleneck from "bottleneck";
import fs from "fs/promises";
import * as Jinritemai from "./utils/jinritemai.js";
import { DocumentService } from "./document.service";

interface Article {
  id: string;
  content: object;
  name: string;
  update_timestamp: number;
}

interface Source {
  name: string; //e.g. "规则中心"
  node_id: string;
}

interface Response<T> {
  data: T;
}

type ArticleResponse = Response<{
  article_info: {
    article_id: string;
    name: string;
    content: string;
    update_timestamp: number;
    tags: string[];
    cover_image: string;
    node_id: string;
    description: string;
    offline_status: number;
    view_count: number;
    search_tags: string[];
    action_info: object;
    target_metas: null;
    creator_name: string;
    modifier_name: string;
    create_timestamp: number;
    show_comment: boolean;
    redirect_obj_id: string;
    redirect_obj_type: number;
    is_redirect: boolean;
  };
  sources: Source[];
}>;

interface MenuItem {
  id: string;
  title: string;
  cover_image: string;
  create_at: number;
  update_at: number;
  obj_type: number;
  view_count: number;
}

type MenuResponse = Response<{
  articles: MenuItem[];
  name: string; // e.g. "商家管理"
  sources: Source[];
  total: number; // e.g. 177
}>;

@Injectable()
export class SyncService {
  public static readonly baseURL: string =
    "https://school.jinritemai.com/api/eschool/v2/library";
  private readonly articlesDir: string = "articles";
  private readonly mdDir: string = "articles-md";
  private readonly merchantID: string = "11593";
  private readonly limiter: Bottleneck;
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly documentService: DocumentService,
  ) {
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
  async syncDouyinKnowledge(mode: SyncMode): Promise<void> {
    await fs.mkdir(this.articlesDir, { recursive: true });
    await fs.mkdir(this.mdDir, { recursive: true });

    await this.executeDouyinSync(mode);
  }

  /**
   * 执行抖音知识同步
   */
  private async executeDouyinSync(mode: SyncMode): Promise<void> {
    const articles = mode === SyncMode.Full ? [] : await this.readArticleList();
    const menu = await this.fetchMerchantMenu();
    const articleInfo = this.parseMenu(menu);
    const existingArticles = new Map(
      articles.map((item) => [item.id, item.update]),
    );
    const pendingArticles = articleInfo.filter((item) => {
      const existingUpdateAt = existingArticles.get(item.id)!;
      const ok = existingUpdateAt >= item.update_at;
      return !ok;
    });
    this.logger.log(
      `Sync ${mode}: ${pendingArticles.length}/${articleInfo.length}`,
    );

    for (let iter = 1; pendingArticles.length > 0; iter++) {
      const success = await Promise.all(
        pendingArticles.map((menuItem) =>
          this.limiter.schedule(async () => {
            this.logger.verbose(`Fetching article ${menuItem.id}`);
            const articleResp = await this.fetchArticle(menuItem.id);

            const article = this.parseArticle(articleResp);
            article.update_timestamp = Math.max(
              article.update_timestamp,
              menuItem.update_at,
            );
            const markdown = Jinritemai.parse(
              article.content as unknown as Jinritemai.Schema,
            );
            const url = `https://school.jinritemai.com/doudian/web/article/${menuItem.id}`;
            const path = articleResp.data.sources.map(
              (source) => source.node_id,
            );
            path.push(menuItem.id);

            this.logger.verbose(`Creating article ${menuItem.id}`);
            const success =
              await this.documentService.createDocumentAndVectorize({
                content: markdown,
                title: article.name,
                file_path: path.join("/"),
                source_type: "douyin",
                source_url: url,
                updatedAt: new Date(article.update_timestamp * 1000),
                path,
              });
            this.logger.verbose(`Finish article ${menuItem.id}`);
            return success;
          }),
        ),
      );
      const failed = pendingArticles.filter((_, index) => !success[index]);
      this.logger.log(
        `Sync Iter ${iter}: ${failed.length} tasks failed, finished ${pendingArticles.length - failed.length}/${pendingArticles.length}`,
      );
      pendingArticles.splice(0, pendingArticles.length, ...failed);
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
    const url = `${SyncService.baseURL}/article/list?node_id=${node_id}&page_size=1000`;
    return this.fetchData(url);
  }

  public async fetchMerchantMenu(): Promise<MenuResponse> {
    return this.fetchMenu(this.merchantID);
  }

  public async fetchArticle(id: string): Promise<ArticleResponse> {
    const url = `${SyncService.baseURL}/article/detail?id=${id}`;
    return this.fetchData(url);
  }

  public parseMenu(json: MenuResponse): MenuItem[] {
    const {
      data: { articles },
    } = json;
    return articles;
  }

  public parseArticle(json: ArticleResponse): Article {
    const {
      data: {
        article_info: { article_id, content, name, update_timestamp },
      },
    } = json;
    return {
      id: article_id,
      content: JSON.parse(content) as object,
      name,
      update_timestamp,
    };
  }

  private async readArticleList(): Promise<
    { id: string; title: string; update: number }[]
  > {
    const documents = await this.documentService.getDocuments({
      source_type: "douyin",
      limit: 1000,
    });
    const articles = documents.data.map((doc) => ({
      id: doc.file_path!.split("/").at(-1)!,
      title: doc.title,
      update: doc.updated_at.getTime() / 1000,
    }));
    return articles;
  }
}
