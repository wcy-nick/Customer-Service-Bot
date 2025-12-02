import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import * as fs from "fs";
import * as path from "path";
import { FileUploadResponse } from "./types/upload";

@Injectable()
export class UploadService {
  constructor(private readonly prismaService: PrismaService) {}

  async uploadDocumentAttachment(
    file: Express.Multer.File,
    documentId?: string,
  ): Promise<FileUploadResponse> {
    try {
      // 验证文档ID是否存在
      if (documentId) {
        const document =
          await this.prismaService.client.knowledgeDocument.findUnique({
            where: { id: documentId },
          });

        if (!document) {
          throw new HttpException("Document not found", HttpStatus.NOT_FOUND);
        }
      }

      // 生成唯一的文件名
      const originalFileName = file.originalname;
      const fileExtension =
        originalFileName.lastIndexOf(".") !== -1
          ? originalFileName.substring(originalFileName.lastIndexOf("."))
          : "";
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${fileExtension}`;

      // 确定文件类型
      let fileType: string;
      if (file.mimetype.startsWith("image/")) {
        fileType = "image";
      } else if (file.mimetype === "application/pdf") {
        fileType = "pdf";
      } else if (file.mimetype.startsWith("video/")) {
        fileType = "video";
      } else if (file.mimetype.startsWith("audio/")) {
        fileType = "audio";
      } else if (
        file.mimetype === "application/msword" ||
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        fileType = "word";
      } else if (
        file.mimetype === "application/vnd.ms-excel" ||
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        fileType = "excel";
      } else {
        fileType = "other";
      }

      // 确保文件目录存在
      const fileDir = path.join(process.cwd(), "uploads", "documents");
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // 保存文件
      const filePath = path.join(fileDir, uniqueFileName);
      fs.writeFileSync(filePath, file.buffer);

      // 保存到数据库
      const relativeFilePath = `uploads/documents/${uniqueFileName}`;

      // 只有当documentId存在时才创建附件记录
      if (documentId) {
        await this.prismaService.client.documentAttachment.create({
          data: {
            documentId,
            fileName: originalFileName,
            filePath: relativeFilePath,
            fileSize: file.size,
            mimeType: file.mimetype,
            fileType,
          },
        });
      }

      return {
        file_path: relativeFilePath,
        file_name: originalFileName,
        mime_type: file.mimetype,
        file_size: file.size,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Error uploading document attachment:", error);
      throw new HttpException(
        "Failed to upload document attachment",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadChatAttachment(
    file: Express.Multer.File,
    sessionId: string,
  ): Promise<FileUploadResponse> {
    try {
      // 验证会话ID是否存在
      const chatSession =
        await this.prismaService.client.chatSession.findUnique({
          where: { id: sessionId },
        });

      if (!chatSession) {
        throw new HttpException("Chat session not found", HttpStatus.NOT_FOUND);
      }

      // 生成唯一的文件名
      const originalFileName = file.originalname;
      const fileExtension =
        originalFileName.lastIndexOf(".") !== -1
          ? originalFileName.substring(originalFileName.lastIndexOf("."))
          : "";
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${fileExtension}`;

      // 确保文件目录存在
      const fileDir = path.join(process.cwd(), "uploads", "chat-attachments");
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // 保存文件
      const filePath = path.join(fileDir, uniqueFileName);
      fs.writeFileSync(filePath, file.buffer);

      // 构建响应
      const relativeFilePath = `uploads/chat-attachments/${uniqueFileName}`;
      return {
        file_path: relativeFilePath,
        file_name: originalFileName,
        mime_type: file.mimetype,
        file_size: file.size,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Error uploading chat attachment:", error);
      throw new HttpException(
        "Failed to upload chat attachment",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteAttachment(attachmentId: string): Promise<boolean> {
    try {
      // 查找附件信息
      const attachment =
        await this.prismaService.client.documentAttachment.findUnique({
          where: { id: attachmentId },
        });

      if (!attachment) {
        throw new HttpException("Attachment not found", HttpStatus.NOT_FOUND);
      }

      // 删除文件
      const filePath = path.join(process.cwd(), attachment.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // 从数据库中删除记录
      await this.prismaService.client.documentAttachment.delete({
        where: { id: attachmentId },
      });

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Error deleting attachment:", error);
      throw new HttpException(
        "Failed to delete attachment",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
