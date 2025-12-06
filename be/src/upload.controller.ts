import {
  Controller,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Body,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadService } from "./upload.service";
import { FileUploadResponse } from "./types/upload";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";

@ApiTags("upload")
@Controller("api/upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({ summary: "上传文档附件" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary", description: "要上传的文件" },
        document_id: { type: "string", description: "文档ID（可选）" },
      },
      required: ["file"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "文件上传成功",
    schema: {
      type: "object",
      properties: {
        file_url: { type: "string", description: "文件访问URL" },
        file_name: { type: "string", description: "文件名" },
        file_size: { type: "number", description: "文件大小（字节）" },
        file_type: { type: "string", description: "文件类型" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "文件不能为空" })
  @ApiResponse({ status: 401, description: "未授权访问" })
  @UseGuards(JwtAuthGuard)
  @Post("document")
  @UseInterceptors(FileInterceptor("file"))
  async uploadDocumentAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body("document_id") documentId?: string,
  ): Promise<FileUploadResponse> {
    if (!file) {
      throw new HttpException("File is required", HttpStatus.BAD_REQUEST);
    }

    return this.uploadService.uploadDocumentAttachment(file, documentId);
  }

  @ApiOperation({ summary: "上传聊天附件" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary", description: "要上传的文件" },
        session_id: { type: "string", description: "聊天会话ID" },
      },
      required: ["file", "session_id"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "文件上传成功",
    schema: {
      type: "object",
      properties: {
        file_url: { type: "string", description: "文件访问URL" },
        file_name: { type: "string", description: "文件名" },
        file_size: { type: "number", description: "文件大小（字节）" },
        file_type: { type: "string", description: "文件类型" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "文件或会话ID不能为空" })
  @ApiResponse({ status: 401, description: "未授权访问" })
  @UseGuards(JwtAuthGuard)
  @Post("chat-attachment")
  @UseInterceptors(FileInterceptor("file"))
  async uploadChatAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body("session_id") sessionId: string,
  ): Promise<FileUploadResponse> {
    if (!file) {
      throw new HttpException("File is required", HttpStatus.BAD_REQUEST);
    }

    if (!sessionId) {
      throw new HttpException("Session ID is required", HttpStatus.BAD_REQUEST);
    }

    return this.uploadService.uploadChatAttachment(file, sessionId);
  }
}
