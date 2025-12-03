import {
  Controller,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { ChatSessionService } from "./chat-session.service";
import type { MessageFeedbackDto } from "./types/chat-session";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";

@ApiTags("messages")
@Controller("api/chat/messages")
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly chatSessionService: ChatSessionService) {}

  /**
   * 提交消息反馈
   * POST /api/chat/messages/:messageId/feedback
   */
  @ApiOperation({ summary: "提交消息反馈" })
  @ApiParam({ name: "messageId", type: String, description: "消息ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        rating: {
          type: "number",
          description: "反馈评分（1-5）",
          minimum: 1,
          maximum: 5,
        },
        comment: { type: "string", description: "反馈内容" },
        feedback_type: {
          type: "string",
          description: "反馈类型",
          enum: ["positive", "negative", "neutral"],
        },
      },
      required: ["rating"],
    },
  })
  @ApiResponse({ status: 200, description: "反馈提交成功" })
  @ApiResponse({ status: 400, description: "无效的请求参数" })
  @ApiResponse({ status: 401, description: "未授权" })
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
