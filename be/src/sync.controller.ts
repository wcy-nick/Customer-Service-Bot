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
import { SyncService } from "./sync.service";
import {
  type SyncJobsQuery,
  type SyncJobDetailDto,
  type DouyinKnowledgeSyncInput,
  type PaginatedResponse,
  SyncMode,
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

@ApiTags("sync")
@Controller("api/sync")
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * 获取同步作业列表
   * @param query 查询参数
   * @returns 分页的同步作业列表
   */
  @ApiOperation({ summary: "获取同步作业列表" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "页码",
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    type: Number,
    description: "每页条数",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "作业状态",
  })
  @ApiResponse({
    status: 200,
    description: "分页的同步作业列表",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "作业ID" },
              type: { type: "string", description: "同步类型" },
              status: { type: "string", description: "作业状态" },
              progress: { type: "number", description: "进度百分比" },
              started_at: {
                type: "string",
                format: "date-time",
                description: "开始时间",
              },
              finished_at: {
                type: "string",
                format: "date-time",
                nullable: true,
                description: "结束时间",
              },
            },
          },
        },
        total: { type: "number", description: "总记录数" },
        page: { type: "number", description: "当前页码" },
        pageSize: { type: "number", description: "每页条数" },
      },
    },
  })
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
  @ApiOperation({ summary: "获取同步作业详情" })
  @ApiParam({ name: "jobId", type: String, description: "作业ID" })
  @ApiResponse({
    status: 200,
    description: "同步作业详情",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "作业ID" },
        type: { type: "string", description: "同步类型" },
        status: { type: "string", description: "作业状态" },
        progress: { type: "number", description: "进度百分比" },
        started_at: {
          type: "string",
          format: "date-time",
          description: "开始时间",
        },
        finished_at: {
          type: "string",
          format: "date-time",
          nullable: true,
          description: "结束时间",
        },
        result: { type: "object", nullable: true, description: "同步结果" },
        error: { type: "string", nullable: true, description: "错误信息" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "作业不存在" })
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
  @ApiOperation({ summary: "触发抖音知识同步" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["full", "incremental"],
          description: "同步模式: full-全量, incremental-增量",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "同步作业响应",
    schema: {},
  })
  @Post("douyin-knowledge")
  async syncDouyinKnowledge(
    @Body() body: DouyinKnowledgeSyncInput | undefined,
  ): Promise<void> {
    const mode = body?.mode || SyncMode.Incremental;
    if (mode !== SyncMode.Incremental && mode !== SyncMode.Full) {
      throw new BadRequestException("Invalid sync mode");
    }
    await this.syncService.syncDouyinKnowledge(mode);
  }

  /**
   * 取消同步作业
   * @param jobId 作业ID
   */
  @ApiOperation({ summary: "取消同步作业" })
  @ApiParam({ name: "jobId", type: String, description: "作业ID" })
  @ApiResponse({ status: 200, description: "作业已取消" })
  @ApiResponse({ status: 404, description: "作业不存在" })
  @ApiResponse({ status: 400, description: "作业已完成或无法取消" })
  @Post("jobs/:jobId/cancel")
  async cancelSyncJob(@Param("jobId") jobId: string): Promise<void> {
    await this.syncService.cancelSyncJob(jobId);
  }
}
