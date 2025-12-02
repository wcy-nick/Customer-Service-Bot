import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { BusinessCategoryService } from "./business-category.service";
import type {
  BusinessCategoryDto,
  CreateBusinessCategoryInput,
  UpdateBusinessCategoryInput,
  ScenarioCategoryDto,
} from "./types/types";

@Controller("api/business-categories")
export class BusinessCategoryController {
  constructor(
    private readonly businessCategoryService: BusinessCategoryService,
  ) {}

  /**
   * 获取业务分类列表
   * GET /api/business-categories
   * Query: { is_active?: boolean }
   */
  @Get()
  async getBusinessCategories(
    @Query("is_active") isActive?: boolean,
  ): Promise<BusinessCategoryDto[]> {
    return this.businessCategoryService.getBusinessCategories(isActive);
  }

  /**
   * 创建业务分类
   * POST /api/business-categories
   * Headers: { Authorization: Bearer {token} }
   */
  @Post()
  @UseGuards(AuthGuard)
  async createBusinessCategory(
    @Req() req: { user: { id: string } },
    @Body() body: CreateBusinessCategoryInput,
  ): Promise<BusinessCategoryDto> {
    const userId = req.user.id;
    return this.businessCategoryService.createBusinessCategory(body, userId);
  }

  /**
   * 更新业务分类
   * PUT /api/business-categories/:id
   * Headers: { Authorization: Bearer {token} }
   */
  @Put(":id")
  @UseGuards(AuthGuard)
  async updateBusinessCategory(
    @Param("id") id: string,
    @Body() body: UpdateBusinessCategoryInput,
  ): Promise<BusinessCategoryDto> {
    return this.businessCategoryService.updateBusinessCategory(id, body);
  }

  /**
   * 删除业务分类
   * DELETE /api/business-categories/:id
   * Headers: { Authorization: Bearer {token} }
   */
  @Delete(":id")
  @UseGuards(AuthGuard)
  async deleteBusinessCategory(@Param("id") id: string): Promise<void> {
    return this.businessCategoryService.deleteBusinessCategory(id);
  }

  /**
   * 获取业务分类的场景列表
   * GET /api/business-categories/:businessId/scenarios
   * Query: { is_active?: boolean }
   */
  @Get(":businessId/scenarios")
  async getBusinessCategoryScenarios(
    @Param("businessId") businessId: string,
    @Query("is_active") isActive?: boolean,
  ): Promise<ScenarioCategoryDto[]> {
    return this.businessCategoryService.getBusinessCategoryScenarios(
      businessId,
      isActive,
    );
  }
}
