// 业务分类相关接口
export interface BusinessCategoryDto {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBusinessCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  sort_order?: number;
}

export interface UpdateBusinessCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

// 场景分类相关接口
export interface ScenarioCategoryDto {
  id: string;
  business_category_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateScenarioInput {
  name: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateScenarioInput {
  name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

// 用户相关接口
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  created_at?: Date;
  is_active?: boolean;
  last_login_at?: Date;
}

export interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
}

export interface UpdateRoleInput {
  role: "admin" | "editor" | "user";
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// 搜索相关接口
export interface SearchResultDto {
  id: string;
  text: string;
  score: number;
  business_category_id?: string;
  document_id?: string;
}

export interface SemanticSearchQuery {
  query: string;
  limit?: number;
  threshold?: number;
  business_category_id?: string;
}

export interface RelatedQuestionsRequest {
  question: string;
}

// 文档相关接口
export interface KnowledgeDocumentDto {
  id: string;
  title: string;
  summary: string;
  business_category_id: string;
  scenario_category_id?: string;
  status: string;
  source_type?: string;
  source_url?: string;
  tags?: string[];
  read_count: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  file_path?: string;
}

export interface KnowledgeDocumentDetailDto extends KnowledgeDocumentDto {
  content: string;
  business_category?: {
    id: string;
    name: string;
  };
  scenario_category?: {
    id: string;
    name: string;
  };
}

export interface DocumentVersionDto {
  version: string;
  created_by: string;
  created_at: Date;
  description?: string;
}

export interface DocumentVersionDetailDto extends DocumentVersionDto {
  content: string;
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  summary?: string;
  file_path?: string;
  source_type?: "manual" | "douyin" | "wechat" | "other";
  source_url?: string;
  tags?: string[];
}

export interface GetDocumentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  business_category_id?: string;
  scenario_category_id?: string;
  status?: string[];
  source_type?: string;
  tags?: string[];
  sort_by?: "created_at" | "updated_at" | "title" | "read_count";
  sort_order?: "asc" | "desc";
}

// 认证相关接口
export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginUserInput {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserDto;
}

export interface RefreshTokenResponse {
  access_token: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
}

// 分析相关接口
export interface DashboardOverviewDto {
  total_sessions: number;
  total_messages: number;
  total_users: number;
  average_session_duration: number;
  satisfaction_score: number;
  trend_data: {
    date: string;
    sessions: number;
    messages: number;
  }[];
}

export interface KnowledgeHeatmapItemDto {
  knowledge_id: string;
  knowledge_title: string;
  business_category_id: string;
  business_category_name: string;
  access_count: number;
  relevance_score: number;
  last_accessed: Date;
}

export interface FrequentQuestionDto {
  question: string;
  frequency: number;
  business_category_id?: string;
  business_category_name?: string;
  first_occurrence: Date;
  last_occurrence: Date;
}

export interface UnansweredQuestionDto {
  id: string;
  question: string;
  ask_count: number;
  created_at: Date;
  updated_at: Date;
  is_resolved: boolean;
  resolved_at?: Date;
  resolved_by?: string;
  related_document_id?: string;
  related_document_title?: string;
}

export interface ResolveUnansweredQuestionInput {
  document_id?: string;
}

export interface AnalyticsDateQuery {
  start_date?: string;
  end_date?: string;
}

export interface DashboardQuery extends AnalyticsDateQuery {
  period?: "day" | "week" | "month";
}

export interface KnowledgeHeatmapQuery extends AnalyticsDateQuery {
  business_category_id?: string;
  limit?: number;
}

export interface FrequentQuestionsQuery extends AnalyticsDateQuery {
  limit?: number;
}

export interface UsageTrendsQuery extends AnalyticsDateQuery {
  metric: "sessions" | "messages" | "documents_viewed" | "user_satisfaction";
  group_by: "day" | "week" | "month";
}

export interface UsageTrendDto {
  date: string;
  value: number;
  metric: string;
}

export interface UserActivityQuery extends AnalyticsDateQuery {
  user_id?: string;
  page?: number;
  limit?: number;
}

export interface UserActivityDto {
  id: string;
  user_id: string;
  user_name: string;
  type: "message" | "session" | "document_view" | "feedback";
  description: string;
  timestamp: Date;
  related_id?: string;
}

export interface UnansweredQuestionsQuery extends AnalyticsDateQuery {
  is_resolved?: boolean;
  page?: number;
  limit?: number;
}

// 同步作业相关接口
export interface SyncJobDto {
  id: string;
  source_type: string;
  status: string;
  sync_type: "full" | "incremental";
  job_type: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  progress?: number;
  total_items?: number;
  processed_items?: number;
}

export interface SyncJobDetailDto extends SyncJobDto {
  logs?: string[];
  error_message?: string;
  job_config?: any;
}

export interface SyncJobsQuery {
  source_type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export enum SyncMode {
  Full = "full",
  Incremental = "incremental",
}

export interface DouyinKnowledgeSyncInput {
  mode: SyncMode;
}

export interface SyncJobResponse {
  job_id: string;
  status: string;
}
