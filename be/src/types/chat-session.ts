// 聊天会话相关的DTO类型定义

// 消息类型枚举
export enum MessageType {
  TEXT = "text",
  VOICE = "voice",
  IMAGE = "image",
}

// 分页响应通用接口
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

// 聊天会话基础信息DTO
export interface ChatSessionDto {
  id: string;
  title?: string;
  messageCount: number;
  lastMessageAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 聊天消息基础信息DTO（用于会话详情）
export interface ChatMessageDto {
  id: string;
  role: string;
  content: string;
  message_type?: MessageType;
  audio_file_path?: string;
  image_file_path?: string;
  createdAt: string;
}

// 聊天会话详细信息DTO
export interface ChatSessionDetailDto extends ChatSessionDto {
  messages: ChatMessageDto[];
}

// 创建聊天会话请求DTO
export interface CreateChatSessionDto {
  title?: string;
}

// 更新聊天会话标题请求DTO
export interface UpdateChatSessionTitleDto {
  title: string;
}

// 获取聊天会话列表查询参数
export interface GetChatSessionsQuery {
  page?: number;
  limit?: number;
  is_active?: boolean;
}

// 获取消息列表查询参数
export interface GetMessagesQuery {
  page?: number;
  limit?: number;
}

// 发送消息请求DTO
export enum ModelName {
  GLM4_5 = "glm-4.5-flash",
  GLM4 = "glm-4-flash-250414",
}

export interface SendMessageDto {
  model?: ModelName;
  content: string;
  type?: MessageType;
  audioFilePath?: string;
  imageFilePath?: string;
  path?: string;
}

// 消息反馈请求DTO
export interface MessageFeedbackDto {
  rating: -1 | 1; // 负面/正面
  feedback_text?: string;
}
