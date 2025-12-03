import {
  Controller,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
import { AuthGuard } from "./auth.guard";
import { ScenarioService } from "./scenario.service";
import type {
  ScenarioCategoryDto,
  CreateScenarioInput,
  UpdateScenarioInput,
} from "./types/types";

@ApiTags("scenario-categories")
@Controller("api")
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @ApiOperation({ summary: "创建场景分类" })
  @ApiParam({ name: "businessId", type: String, description: "业务分类ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "场景名称" },
        description: { type: "string", description: "场景描述" },
        sort_order: { type: "number", description: "排序顺序" },
      },
      required: ["name"],
    },
    description: "场景分类创建数据",
  })
  @ApiResponse({
    status: 201,
    description: "场景分类创建成功",
    schema: {
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
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "业务分类不存在" })
  @Post("business-categories/:businessId/scenarios")
  @UseGuards(AuthGuard)
  async createScenario(
    @Param("businessId") businessId: string,
    @Body() body: CreateScenarioInput,
    @Req() req: { user: { id: string } },
  ): Promise<ScenarioCategoryDto> {
    const userId = req.user.id;
    return this.scenarioService.createScenario(businessId, body, userId);
  }

  @ApiOperation({ summary: "更新场景分类" })
  @ApiParam({ name: "id", type: String, description: "场景分类ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "场景名称" },
        description: { type: "string", description: "场景描述" },
        sort_order: { type: "number", description: "排序顺序" },
        is_active: { type: "boolean", description: "是否激活" },
      },
    },
    description: "场景分类更新数据",
  })
  @ApiResponse({
    status: 200,
    description: "场景分类更新成功",
    schema: {
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
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "场景分类不存在" })
  @Put("scenarios/:id")
  @UseGuards(AuthGuard)
  async updateScenario(
    @Param("id") id: string,
    @Body() body: UpdateScenarioInput,
  ): Promise<ScenarioCategoryDto> {
    return this.scenarioService.updateScenario(id, body);
  }

  @ApiOperation({ summary: "删除场景分类" })
  @ApiParam({ name: "id", type: String, description: "场景分类ID" })
  @ApiResponse({ status: 200, description: "场景分类删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "场景分类不存在" })
  @Delete("scenarios/:id")
  @UseGuards(AuthGuard)
  async deleteScenario(@Param("id") id: string): Promise<void> {
    return this.scenarioService.deleteScenario(id);
  }
}
