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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { AuthGuard } from "./auth.guard";
import { BusinessCategoryService } from "./business-category.service";
import type {
  BusinessCategoryDto,
  CreateBusinessCategoryInput,
  UpdateBusinessCategoryInput,
  ScenarioCategoryDto,
} from "./types/types";

@ApiTags("business-categories")
@Controller("api/business-categories")
export class BusinessCategoryController {
  constructor(
    private readonly businessCategoryService: BusinessCategoryService,
  ) {}

  @ApiOperation({ summary: "获取业务分类列表" })
  @ApiQuery({
    name: "is_active",
    required: false,
    type: Boolean,
    description: "是否只返回激活的分类",
  })
  @ApiResponse({
    status: 200,
    description: "业务分类列表",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "分类ID" },
          name: { type: "string", description: "分类名称" },
          description: { type: "string", description: "分类描述" },
          icon: { type: "string", description: "分类图标" },
          sort_order: { type: "number", description: "排序顺序" },
          is_active: { type: "boolean", description: "是否激活" },
          created_by: { type: "string", description: "创建人ID" },
          created_at: {
            type: "string",
            format: "date-time",
            description: "创建时间",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            description: "更新时间",
          },
        },
        required: [
          "id",
          "name",
          "sort_order",
          "is_active",
          "created_at",
          "updated_at",
        ],
      },
    },
  })
  @Get()
  async getBusinessCategories(
    @Query("is_active") isActive?: boolean,
  ): Promise<BusinessCategoryDto[]> {
    return this.businessCategoryService.getBusinessCategories(isActive);
  }

  @ApiOperation({ summary: "创建业务分类" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "分类名称" },
        description: { type: "string", description: "分类描述" },
        icon: { type: "string", description: "分类图标" },
        sort_order: { type: "number", description: "排序顺序" },
      },
      required: ["name"],
    },
    description: "业务分类创建数据",
  })
  @ApiResponse({
    status: 201,
    description: "业务分类创建成功",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "分类ID" },
        name: { type: "string", description: "分类名称" },
        description: { type: "string", description: "分类描述" },
        icon: { type: "string", description: "分类图标" },
        sort_order: { type: "number", description: "排序顺序" },
        is_active: { type: "boolean", description: "是否激活" },
        created_by: { type: "string", description: "创建人ID" },
        created_at: {
          type: "string",
          format: "date-time",
          description: "创建时间",
        },
        updated_at: {
          type: "string",
          format: "date-time",
          description: "更新时间",
        },
      },
      required: [
        "id",
        "name",
        "sort_order",
        "is_active",
        "created_at",
        "updated_at",
      ],
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @Post()
  @UseGuards(AuthGuard)
  async createBusinessCategory(
    @Req() req: { user: { id: string } },
    @Body() body: CreateBusinessCategoryInput,
  ): Promise<BusinessCategoryDto> {
    const userId = req.user.id;
    return this.businessCategoryService.createBusinessCategory(body, userId);
  }

  @ApiOperation({ summary: "更新业务分类" })
  @ApiParam({ name: "id", type: String, description: "业务分类ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "分类名称" },
        description: { type: "string", description: "分类描述" },
        icon: { type: "string", description: "分类图标" },
        sort_order: { type: "number", description: "排序顺序" },
        is_active: { type: "boolean", description: "是否激活" },
      },
    },
    description: "业务分类更新数据",
  })
  @ApiResponse({
    status: 200,
    description: "业务分类更新成功",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "分类ID" },
        name: { type: "string", description: "分类名称" },
        description: { type: "string", description: "分类描述" },
        icon: { type: "string", description: "分类图标" },
        sort_order: { type: "number", description: "排序顺序" },
        is_active: { type: "boolean", description: "是否激活" },
        created_by: { type: "string", description: "创建人ID" },
        created_at: {
          type: "string",
          format: "date-time",
          description: "创建时间",
        },
        updated_at: {
          type: "string",
          format: "date-time",
          description: "更新时间",
        },
      },
      required: [
        "id",
        "name",
        "sort_order",
        "is_active",
        "created_at",
        "updated_at",
      ],
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "业务分类不存在" })
  @Put(":id")
  @UseGuards(AuthGuard)
  async updateBusinessCategory(
    @Param("id") id: string,
    @Body() body: UpdateBusinessCategoryInput,
  ): Promise<BusinessCategoryDto> {
    return this.businessCategoryService.updateBusinessCategory(id, body);
  }

  @ApiOperation({ summary: "删除业务分类" })
  @ApiParam({ name: "id", type: String, description: "业务分类ID" })
  @ApiResponse({ status: 200, description: "业务分类删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "业务分类不存在" })
  @Delete(":id")
  @UseGuards(AuthGuard)
  async deleteBusinessCategory(@Param("id") id: string): Promise<void> {
    return this.businessCategoryService.deleteBusinessCategory(id);
  }

  @ApiOperation({ summary: "获取业务分类的场景列表" })
  @ApiParam({ name: "businessId", type: String, description: "业务分类ID" })
  @ApiQuery({
    name: "is_active",
    required: false,
    type: Boolean,
    description: "是否只返回激活的场景",
  })
  @ApiResponse({
    status: 200,
    description: "场景分类列表",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "场景ID" },
          business_category_id: { type: "string", description: "业务分类ID" },
          name: { type: "string", description: "场景名称" },
          description: { type: "string", description: "场景描述" },
          sort_order: { type: "number", description: "排序顺序" },
          is_active: { type: "boolean", description: "是否激活" },
          created_by: { type: "string", description: "创建人ID" },
          created_at: {
            type: "string",
            format: "date-time",
            description: "创建时间",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            description: "更新时间",
          },
        },
        required: [
          "id",
          "business_category_id",
          "name",
          "sort_order",
          "is_active",
          "created_at",
          "updated_at",
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: "业务分类不存在" })
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
