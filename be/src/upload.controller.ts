import {
  Controller,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Body,
  Request,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { UploadService } from "./upload.service";
import { FileUploadResponse } from "./types/upload";

@Controller("api/upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(AuthGuard("jwt"))
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

  @UseGuards(AuthGuard("jwt"))
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
