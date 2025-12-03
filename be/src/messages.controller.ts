import {
  Controller,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { ChatSessionService } from "./chat-session.service";
import type { MessageFeedbackDto } from "./types/chat-session";

@Controller("api/chat/messages")
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private readonly chatSessionService: ChatSessionService) {}

  /**
   * 提交消息反馈
   * POST /api/chat/messages/:messageId/feedback
   */
  @Post(":messageId/feedback")
  async createMessageFeedback(
    @Request() req: { user: { id: string } },
    @Param("messageId") messageId: string,
    @Body() data: MessageFeedbackDto,
  ): Promise<void> {
    const userId = req.user.id;
    await this.chatSessionService.createMessageFeedback(
      userId,
      messageId,
      data,
    );
  }
}
