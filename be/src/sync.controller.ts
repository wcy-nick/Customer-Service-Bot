import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { SyncService } from "./sync.service";
import type {
  SyncJobsQuery,
  SyncJobDetailDto,
  DouyinKnowledgeSyncInput,
  SyncJobResponse,
  PaginatedResponse,
} from "./types/types";
import { AuthGuard } from "./auth.guard";

@Controller("api/sync")
@UseGuards(AuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * 获取同步作业列表
   * @param query 查询参数
   * @returns 分页的同步作业列表
   */
  @Get("jobs")
  async getSyncJobs(
    @Query() query: SyncJobsQuery,
  ): Promise<PaginatedResponse<any>> {
    return this.syncService.getSyncJobs(query);
  }

  /**
   * 获取同步作业详情
   * @param jobId 作业ID
   * @returns 同步作业详情
   */
  @Get("jobs/:jobId")
  async getSyncJobDetail(
    @Param("jobId") jobId: string,
  ): Promise<SyncJobDetailDto> {
    const job = await this.syncService.getSyncJobDetail(jobId);
    if (!job) {
      throw new Error(`Sync job with id ${jobId} not found`);
    }
    return job;
  }

  /**
   * 触发抖音知识同步
   * @param body 同步请求体
   * @returns 同步作业响应
   */
  @Post("douyin-knowledge")
  async syncDouyinKnowledge(
    @Body() body: DouyinKnowledgeSyncInput,
  ): Promise<SyncJobResponse> {
    return this.syncService.syncDouyinKnowledge(body);
  }

  /**
   * 取消同步作业
   * @param jobId 作业ID
   */
  @Post("jobs/:jobId/cancel")
  async cancelSyncJob(@Param("jobId") jobId: string): Promise<void> {
    await this.syncService.cancelSyncJob(jobId);
  }
}
