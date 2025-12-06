import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Logger,
  Request,
  ParseIntPipe,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { DocumentService } from "./document.service";
import type {
  KnowledgeDocumentDto,
  KnowledgeDocumentDetailDto,
  DocumentVersionDto,
  DocumentVersionDetailDto,
  GetDocumentsQuery,
  CreateDocumentInput,
  PaginatedResponse,
} from "./types/types";

import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";

@ApiTags("documents")
@Controller("api/documents")
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  @ApiOperation({ summary: "获取文档列表" })
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
    name: "category_id",
    required: false,
    type: String,
    description: "分类ID",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "文档状态",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "搜索关键词",
  })
  @ApiResponse({
    status: 200,
    description: "获取文档列表成功",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "文档ID" },
              title: { type: "string", description: "文档标题" },
              summary: { type: "string", description: "文档摘要" },
              business_category_id: {
                type: "string",
                description: "业务分类ID",
              },
              scenario_category_id: {
                type: "string",
                description: "场景分类ID",
                nullable: true,
              },
              status: { type: "string", description: "文档状态" },
              source_type: {
                type: "string",
                description: "文档来源类型",
                nullable: true,
              },
              source_url: {
                type: "string",
                description: "文档来源URL",
                nullable: true,
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "文档标签",
                nullable: true,
              },
              read_count: { type: "number", description: "文档阅读次数" },
              created_by: {
                type: "string",
                description: "创建人",
                nullable: true,
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
              file_url: {
                type: "string",
                description: "文件URL",
                nullable: true,
              },
            },
            required: [
              "id",
              "title",
              "summary",
              "business_category_id",
              "status",
              "read_count",
              "created_at",
              "updated_at",
            ],
          },
        },
        meta: {
          type: "object",
          properties: {
            total: { type: "number", description: "总记录数" },
            page: { type: "number", description: "当前页码" },
            limit: { type: "number", description: "每页记录数" },
            total_pages: { type: "number", description: "总页数" },
          },
          required: ["total", "page", "limit", "total_pages"],
        },
      },
      required: ["data", "meta"],
    },
  })
  @Get()
  async getDocuments(
    @Query() query: GetDocumentsQuery,
  ): Promise<PaginatedResponse<KnowledgeDocumentDto>> {
    return this.documentService.getDocuments(query);
  }

  @ApiOperation({ summary: "获取文档详情" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiResponse({
    status: 200,
    description: "文档详情",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "文档ID" },
        title: { type: "string", description: "文档标题" },
        content: { type: "string", description: "文档内容" },
        category_id: { type: "string", description: "分类ID" },
        status: { type: "string", description: "文档状态" },
        created_by: { type: "string", description: "创建者ID" },
        updated_by: { type: "string", description: "更新者ID" },
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
  @Get(":id")
  async getDocumentById(
    @Param("id") id: string,
  ): Promise<KnowledgeDocumentDetailDto> {
    return this.documentService.getDocumentById(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "创建新文档（支持文件上传）" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "文档标题，默认为file的originalname",
          example: "用户手册",
        },
        content: {
          type: "string",
          description: "文档内容，默认从文件内容读取",
          example: "这是一个详细的用户手册...",
        },
        category_id: {
          type: "string",
          description: "分类ID",
          example: "cat_123",
        },
        tags: {
          type: "string",
          description: "标签（逗号分隔）",
          example: "手册,指南",
        },
        file: { type: "string", format: "binary", description: "上传的文件" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "文档创建成功" })
  @ApiResponse({ status: 400, description: "无效的请求参数" })
  @ApiResponse({ status: 401, description: "未授权" })
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async createDocument(
    @Body() body: CreateDocumentInput,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    if (file) {
      this.logger.log(`File uploaded: ${file.originalname}`);
      body.title ||= file.originalname;
      body.content ||= file.buffer.toString("utf8");
      if (body.content.includes("\uFFFD")) {
        throw new BadRequestException(`${body.title} 内容包含无效字符`);
      }
    }
    if (!body.title) {
      throw new BadRequestException("标题不能为空");
    }
    if (!body.content) {
      throw new BadRequestException("内容不能为空");
    }

    // 从请求中获取用户ID
    const userId = req.user.id || "system";

    return this.documentService.createDocument({
      ...body,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "更新文档" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "文档标题" },
        content: { type: "string", description: "文档内容" },
        category_id: { type: "string", description: "分类ID" },
        status: { type: "string", description: "文档状态" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "标签列表",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "更新后的文档",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "文档ID" },
        title: { type: "string", description: "文档标题" },
        content: { type: "string", description: "文档内容" },
        category_id: { type: "string", description: "分类ID" },
        status: { type: "string", description: "文档状态" },
        created_by: { type: "string", description: "创建者ID" },
        updated_by: { type: "string", description: "更新者ID" },
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
  @ApiResponse({ status: 400, description: "无效的请求参数" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "文档不存在" })
  @UseGuards(JwtAuthGuard)
  @Put(":id")
  async updateDocument(
    @Param("id") id: string,
    @Body() body: Partial<KnowledgeDocumentDto>,
    @Request() req: { user: { id: string } },
  ): Promise<KnowledgeDocumentDto> {
    const userId = req.user.id || "system";
    return this.documentService.updateDocument(id, body, userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "删除文档" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiResponse({ status: 200, description: "文档删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "文档不存在" })
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async deleteDocument(@Param("id") id: string): Promise<void> {
    return this.documentService.deleteDocument(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "发布文档" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiResponse({
    status: 200,
    description: "文档发布成功",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "文档ID" },
        title: { type: "string", description: "文档标题" },
        status: { type: "string", description: "文档状态（已发布）" },
        updated_at: {
          type: "string",
          format: "date-time",
          description: "更新时间",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "文档不存在" })
  @UseGuards(JwtAuthGuard)
  @Post(":id/publish")
  async publishDocument(
    @Param("id") id: string,
  ): Promise<KnowledgeDocumentDto> {
    return this.documentService.publishDocument(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "归档文档" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiResponse({
    status: 200,
    description: "文档归档成功",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "文档ID" },
        title: { type: "string", description: "文档标题" },
        status: { type: "string", description: "文档状态（已归档）" },
        updated_at: {
          type: "string",
          format: "date-time",
          description: "更新时间",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "文档不存在" })
  @UseGuards(JwtAuthGuard)
  @Post(":id/archive")
  async archiveDocument(
    @Param("id") id: string,
  ): Promise<KnowledgeDocumentDto> {
    return this.documentService.archiveDocument(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "向量化文档" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiResponse({ status: 200, description: "文档向量化成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "文档不存在" })
  @UseGuards(JwtAuthGuard)
  @Post(":id/vectorize")
  async vectorizeDocument(@Param("id") id: string): Promise<void> {
    const success = await this.documentService.vectorizeDocumentById(id);
    if (!success) {
      throw new InternalServerErrorException("向量化文档失败");
    }
  }

  @ApiOperation({ summary: "获取文档版本列表" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiResponse({
    status: 200,
    description: "文档版本列表",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "版本ID" },
          document_id: { type: "string", description: "文档ID" },
          version: { type: "number", description: "版本号" },
          title: { type: "string", description: "文档标题" },
          created_by: { type: "string", description: "创建者ID" },
          created_at: {
            type: "string",
            format: "date-time",
            description: "创建时间",
          },
        },
      },
    },
  })
  @Get(":id/versions")
  async getDocumentVersions(
    @Param("id") id: string,
  ): Promise<DocumentVersionDto[]> {
    return this.documentService.getDocumentVersions(id);
  }

  @ApiOperation({ summary: "获取特定版本文档详情" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiParam({ name: "version", type: Number, description: "版本号" })
  @ApiResponse({
    status: 200,
    description: "版本文档详情",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "版本ID" },
        document_id: { type: "string", description: "文档ID" },
        version: { type: "number", description: "版本号" },
        title: { type: "string", description: "文档标题" },
        content: { type: "string", description: "文档内容" },
        created_by: { type: "string", description: "创建者ID" },
        created_at: {
          type: "string",
          format: "date-time",
          description: "创建时间",
        },
      },
    },
  })
  @Get(":id/versions/:version")
  async getDocumentVersionDetail(
    @Param("id") id: string,
    @Param("version", ParseIntPipe) version: number,
  ): Promise<DocumentVersionDetailDto> {
    return this.documentService.getDocumentVersionDetail(id, version);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "回滚到特定版本" })
  @ApiParam({ name: "id", type: String, description: "文档ID" })
  @ApiParam({ name: "version", type: Number, description: "版本号" })
  @ApiResponse({
    status: 200,
    description: "文档回滚成功",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "文档ID" },
        title: { type: "string", description: "文档标题" },
        content: { type: "string", description: "文档内容" },
        current_version: { type: "number", description: "当前版本号" },
        updated_at: {
          type: "string",
          format: "date-time",
          description: "更新时间",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "文档或版本不存在" })
  @UseGuards(JwtAuthGuard)
  @Post(":id/rollback/:version")
  async rollbackDocument(
    @Param("id") id: string,
    @Param("version", ParseIntPipe) version: number,
    @Request() req: { user: { id: string } },
  ): Promise<KnowledgeDocumentDto> {
    const userId = req.user.id || "system";
    return this.documentService.rollbackDocument(id, version, userId);
  }
}
