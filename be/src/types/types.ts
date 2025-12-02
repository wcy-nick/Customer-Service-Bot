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
