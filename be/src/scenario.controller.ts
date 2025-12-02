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
import { AuthGuard } from "./auth.guard";
import { ScenarioService } from "./scenario.service";
import type {
  ScenarioCategoryDto,
  CreateScenarioInput,
  UpdateScenarioInput,
} from "./types/types";

@Controller("api")
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  /**
   * 创建场景分类
   * POST /api/business-categories/:businessId/scenarios
   * Headers: { Authorization: Bearer {token} }
   */
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

  /**
   * 更新场景分类
   * PUT /api/scenarios/:id
   * Headers: { Authorization: Bearer {token} }
   */
  @Put("scenarios/:id")
  @UseGuards(AuthGuard)
  async updateScenario(
    @Param("id") id: string,
    @Body() body: UpdateScenarioInput,
  ): Promise<ScenarioCategoryDto> {
    return this.scenarioService.updateScenario(id, body);
  }

  /**
   * 删除场景分类
   * DELETE /api/scenarios/:id
   * Headers: { Authorization: Bearer {token} }
   */
  @Delete("scenarios/:id")
  @UseGuards(AuthGuard)
  async deleteScenario(@Param("id") id: string): Promise<void> {
    return this.scenarioService.deleteScenario(id);
  }
}
