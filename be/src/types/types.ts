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
  content: string;
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
  file_url?: string;
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
  business_category_id: string;
  scenario_category_id?: string;
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
