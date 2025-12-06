import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import {
  KnowledgeDocumentDto,
  KnowledgeDocumentDetailDto,
  DocumentVersionDto,
  DocumentVersionDetailDto,
  CreateDocumentInput,
  GetDocumentsQuery,
  PaginatedResponse,
} from "./types/types";
import { Prisma } from "@prisma/client";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantService } from "./qdrant.service";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";

interface KnowledgeDocumentModel {
  id: string;
  title: string;
  summary?: string | null;
  businessCategoryId?: string | null;
  scenarioCategoryId?: string | null;
  status: string;
  sourceType?: string;
  sourceUrl?: string | null;
  tags?: string[];
  readCount: number;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  filePath?: string | null;
}

interface KnowledgeDocumentDetailModel extends KnowledgeDocumentModel {
  content?: string | null;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(QdrantService.name);
  textSplitter: RecursiveCharacterTextSplitter;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly qdrantService: QdrantService,
    private readonly configService: ConfigService,
  ) {
    const chunkSize = parseInt(this.configService.get("CHUNK_SIZE") || "1000");
    const chunkOverlap = parseInt(
      this.configService.get("CHUNK_OVERLAP") || "200",
    );
    this.logger.verbose(
      `Initializing DocumentService with chunkSize: ${chunkSize}, chunkOverlap: ${chunkOverlap}`,
    );
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });
  }

  // 修改Prisma访问方式，使用正确的模型名称
  async getDocuments(
    query: GetDocumentsQuery,
  ): Promise<PaginatedResponse<KnowledgeDocumentDto>> {
    const {
      page = 1,
      limit = 10,
      search,
      business_category_id,
      scenario_category_id,
      status,
      source_type,
      tags,
      sort_by = "createdAt",
      sort_order = "desc",
    } = query;

    // 构建查询条件
    const whereClause: Prisma.KnowledgeDocumentWhereInput = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    if (business_category_id) {
      whereClause.businessCategoryId = business_category_id;
    }

    if (scenario_category_id) {
      whereClause.scenarioCategoryId = scenario_category_id;
    }

    if (status && status.length > 0) {
      whereClause.status = { in: status };
    }

    if (source_type) {
      whereClause.sourceType = source_type;
    }

    if (tags && tags.length > 0) {
      whereClause.tags = { hasEvery: tags };
    }

    // 计算总数
    const total = await this.prismaService.client.knowledgeDocument.count({
      where: whereClause,
    });

    // 查询文档列表
    const documents =
      await this.prismaService.client.knowledgeDocument.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      });

    // 转换为DTO
    const data = documents.map((doc) => this.mapToDto(doc));

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

  async getDocumentById(id: string): Promise<KnowledgeDocumentDetailDto> {
    const document =
      await this.prismaService.client.knowledgeDocument.findUnique({
        where: { id },
        include: {
          businessCategory: { select: { id: true, name: true } },
          scenarioCategory: { select: { id: true, name: true } },
          // 移除不支持的include
        },
      });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    return this.mapToDetailDto(document);
  }

  async createDocument(
    input: CreateDocumentInput & {
      createdBy?: string;
      updatedBy?: string;
      updatedAt?: Date;
    },
  ): Promise<KnowledgeDocumentDto> {
    const document = await this.prismaService.client.knowledgeDocument.create({
      data: {
        title: input.title,
        content: input.content,
        summary: input.summary,
        filePath: input.file_path,
        sourceType: input.source_type,
        sourceUrl: input.source_url,
        tags: input.tags,
        createdBy: input.createdBy,
        updatedBy: input.updatedBy,
        updatedAt: input.updatedAt,
      },
    });

    return this.mapToDto(document);
  }

  async createMany(
    input: (CreateDocumentInput & { updateAt: Date })[],
  ): Promise<void> {
    await this.prismaService.client.knowledgeDocument.createMany({
      data: input.map((item) => ({
        title: item.title,
        content: item.content,
        summary: item.summary,
        filePath: item.file_path,
        sourceType: item.source_type,
        sourceUrl: item.source_url,
        tags: item.tags,
        updatedAt: item.updateAt,
      })),
    });
  }

  async updateDocument(
    id: string,
    data: Partial<KnowledgeDocumentDto>,
    userId: string,
  ): Promise<KnowledgeDocumentDto> {
    const existingDocument =
      await this.prismaService.client.knowledgeDocument.findUnique({
        where: { id },
      });

    if (!existingDocument) {
      throw new NotFoundException("Document not found");
    }

    // 更新文档
    const updateData = { ...data, updatedBy: userId };

    const updatedDocument =
      await this.prismaService.client.knowledgeDocument.update({
        where: { id },
        data: updateData,
        include: {
          businessCategory: { select: { id: true, name: true } },
          scenarioCategory: { select: { id: true, name: true } },
        },
      });

    return this.mapToDto(updatedDocument);
  }

  async deleteDocument(id: string): Promise<void> {
    const existingDocument =
      await this.prismaService.client.knowledgeDocument.findUnique({
        where: { id },
      });

    if (!existingDocument) {
      return;
    }

    // 先删除所有版本记录
    await this.prismaService.client.documentVersion.deleteMany({
      where: { documentId: id },
    });

    // 删除文档
    await this.prismaService.client.knowledgeDocument.delete({ where: { id } });
  }

  async publishDocument(id: string): Promise<KnowledgeDocumentDto> {
    const existingDocument =
      await this.prismaService.client.knowledgeDocument.findUnique({
        where: { id },
      });

    if (!existingDocument) {
      throw new NotFoundException("Document not found");
    }

    const updatedDocument =
      await this.prismaService.client.knowledgeDocument.update({
        where: { id },
        data: { status: "published" },
        include: {
          businessCategory: { select: { id: true, name: true } },
          scenarioCategory: { select: { id: true, name: true } },
          // 移除不支持的include
        },
      });

    return this.mapToDto(updatedDocument);
  }

  async archiveDocument(id: string): Promise<KnowledgeDocumentDto> {
    const existingDocument =
      await this.prismaService.client.knowledgeDocument.findUnique({
        where: { id },
      });

    if (!existingDocument) {
      throw new NotFoundException("Document not found");
    }

    const updatedDocument =
      await this.prismaService.client.knowledgeDocument.update({
        where: { id },
        data: { status: "archived" },
        include: {
          businessCategory: { select: { id: true, name: true } },
          scenarioCategory: { select: { id: true, name: true } },
          // 移除不支持的include
        },
      });

    return this.mapToDto(updatedDocument);
  }

  async vectorizeDocumentById(id: string): Promise<boolean> {
    // 获取文档信息
    const document =
      await this.prismaService.client.knowledgeDocument.findUnique({
        where: { id },
        select: {
          title: true,
          content: true,
          id: true,
          sourceUrl: true,
          createdBy: true,
        },
      });

    if (!document?.content) {
      throw new NotFoundException(
        `Document with id ${id} not found or has no content`,
      );
    }
    return this.vectorizeDocument(document.createdBy || "", {
      content: document.content,
      url: document.sourceUrl || "",
      path: [],
    });
  }

  async vectorizeDocument(
    collection: string,
    document: {
      content: string;
      path: string[];
      url: string;
    },
  ): Promise<boolean> {
    // 文本分割
    const chunks = await this.textSplitter.splitText(document.content);

    // 为每个chunk添加元数据
    const documents = chunks.map((chunk, index) => ({
      id: randomUUID(),
      text: chunk,
      url: document.url || "",
      path: [...document.path, index.toString()],
    }));

    // 调用QdrantService进行向量存储
    collection ||= this.qdrantService.defaultCollection;
    await this.qdrantService.ensureCollection(collection);
    const success = await this.qdrantService.upsertDocuments(
      collection,
      documents,
    );
    return success;
  }

  async getDocumentVersions(id: string): Promise<DocumentVersionDto[]> {
    const versions = await this.prismaService.client.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: "desc" },
    });

    return versions.map((version) => ({
      version: String(version.version),
      created_by: version.createdBy || "",
      created_at: version.createdAt,
    }));
  }

  async getDocumentVersionDetail(
    id: string,
    version: number,
  ): Promise<DocumentVersionDetailDto> {
    const versionDetail =
      await this.prismaService.client.documentVersion.findUnique({
        where: { documentId_version: { documentId: id, version } },
      });

    if (!versionDetail) {
      throw new NotFoundException("Version not found");
    }

    return {
      version: String(versionDetail.version),
      content: versionDetail.content,
      created_by: versionDetail.createdBy || "",
      created_at: versionDetail.createdAt,
    };
  }

  async rollbackDocument(
    id: string,
    version: number,
    userId: string,
  ): Promise<KnowledgeDocumentDto> {
    const versionToRollback =
      await this.prismaService.client.documentVersion.findUnique({
        where: { documentId_version: { documentId: id, version } },
      });

    if (!versionToRollback) {
      throw new NotFoundException("Version not found");
    }

    // 更新文档
    const updatedDocument =
      await this.prismaService.client.knowledgeDocument.update({
        where: { id },
        data: {
          content: versionToRollback.content,
          updatedBy: userId,
        },
        include: {
          businessCategory: { select: { id: true, name: true } },
          scenarioCategory: { select: { id: true, name: true } },
          // 移除不支持的include
        },
      });

    return this.mapToDto(updatedDocument);
  }

  // 转换为基本DTO
  private mapToDto(document: KnowledgeDocumentModel): KnowledgeDocumentDto {
    return {
      id: document.id,
      title: document.title,
      summary: document.summary ?? "",
      business_category_id: document.businessCategoryId ?? "",
      scenario_category_id: document.scenarioCategoryId ?? "",
      status: document.status,
      source_type: document.sourceType ?? "",
      source_url: document.sourceUrl ?? "",
      tags: document.tags ?? [],
      read_count: document.readCount,
      created_by: document.createdBy ?? "",
      created_at: document.createdAt,
      updated_at: document.updatedAt,
      file_path: document.filePath ?? "",
    };
  }

  // 转换为详细DTO
  private mapToDetailDto(
    document: KnowledgeDocumentDetailModel,
  ): KnowledgeDocumentDetailDto {
    return {
      ...this.mapToDto(document),
      content: document.content ?? "",
    };
  }
}
