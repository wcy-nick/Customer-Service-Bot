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
} from "@nestjs/common";
import { DocumentService } from "./document.service";
import type {
  KnowledgeDocumentDto,
  KnowledgeDocumentDetailDto,
  DocumentVersionDto,
  DocumentVersionDetailDto,
  GetDocumentsQuery,
  CreateDocumentInput,
} from "./types/types";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";

@Controller("api/documents")
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async getDocuments(@Query() query: GetDocumentsQuery): Promise<any> {
    return this.documentService.getDocuments(query);
  }

  @Get(":id")
  async getDocumentById(
    @Param("id") id: string,
  ): Promise<KnowledgeDocumentDetailDto> {
    return this.documentService.getDocumentById(id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async createDocument(
    @Body() body: CreateDocumentInput,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    // 如果有文件，记录日志
    if (file) {
      this.logger.log(`File uploaded: ${file.originalname}`);
      // 这里可以处理文件上传逻辑
    }

    // 从请求中获取用户ID
    const userId = req.user.id || "system";

    return this.documentService.createDocument(body, userId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Put(":id")
  async updateDocument(
    @Param("id") id: string,
    @Body() body: Partial<KnowledgeDocumentDto>,
    @Request() req: { user: { id: string } },
  ): Promise<KnowledgeDocumentDto> {
    const userId = req.user.id || "system";
    return this.documentService.updateDocument(id, body, userId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete(":id")
  async deleteDocument(@Param("id") id: string): Promise<void> {
    return this.documentService.deleteDocument(id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":id/publish")
  async publishDocument(
    @Param("id") id: string,
  ): Promise<KnowledgeDocumentDto> {
    return this.documentService.publishDocument(id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":id/archive")
  async archiveDocument(
    @Param("id") id: string,
  ): Promise<KnowledgeDocumentDto> {
    return this.documentService.archiveDocument(id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":id/vectorize")
  async vectorizeDocument(@Param("id") id: string): Promise<void> {
    return this.documentService.vectorizeDocument(id);
  }

  @Get(":id/versions")
  async getDocumentVersions(
    @Param("id") id: string,
  ): Promise<DocumentVersionDto[]> {
    return this.documentService.getDocumentVersions(id);
  }

  @Get(":id/versions/:version")
  async getDocumentVersionDetail(
    @Param("id") id: string,
    @Param("version", ParseIntPipe) version: number,
  ): Promise<DocumentVersionDetailDto> {
    return this.documentService.getDocumentVersionDetail(id, version);
  }

  @UseGuards(AuthGuard("jwt"))
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
