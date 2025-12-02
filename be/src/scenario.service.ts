import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import {
  ScenarioCategoryDto,
  CreateScenarioInput,
  UpdateScenarioInput,
} from "./types/types";

interface SenarioCategoryModel {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy?: string | null;
  businessCategoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ScenarioService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建场景分类
   */
  async createScenario(
    businessId: string,
    input: CreateScenarioInput,
    userId: string,
  ): Promise<ScenarioCategoryDto> {
    // 检查业务分类是否存在
    const businessCategory =
      await this.prisma.client.businessCategory.findUnique({
        where: { id: businessId },
      });

    if (!businessCategory) {
      throw new NotFoundException("业务分类不存在");
    }

    // 检查在同一业务分类下是否存在同名场景
    const existingScenario =
      await this.prisma.client.scenarioCategory.findFirst({
        where: {
          businessCategoryId: businessId,
          name: input.name,
          isActive: true,
        },
      });

    if (existingScenario) {
      throw new BadRequestException("在该业务分类下，场景名称已存在");
    }

    const scenario = await this.prisma.client.scenarioCategory.create({
      data: {
        businessCategoryId: businessId,
        name: input.name,
        description: input.description,
        sortOrder: input.sort_order || 0,
        createdBy: userId,
      },
    });

    return ScenarioService.mapToDto(scenario);
  }

  /**
   * 更新场景分类
   */
  async updateScenario(
    id: string,
    input: UpdateScenarioInput,
  ): Promise<ScenarioCategoryDto> {
    // 检查场景分类是否存在
    const existingScenario =
      await this.prisma.client.scenarioCategory.findUnique({
        where: { id },
      });

    if (!existingScenario) {
      throw new NotFoundException("场景分类不存在");
    }

    // 如果更新名称，检查在同一业务分类下是否存在同名场景
    if (input.name && input.name !== existingScenario.name) {
      const nameExists = await this.prisma.client.scenarioCategory.findFirst({
        where: {
          businessCategoryId: existingScenario.businessCategoryId,
          name: input.name,
          id: { not: id },
        },
      });

      if (nameExists) {
        throw new BadRequestException("在该业务分类下，场景名称已存在");
      }
    }

    const updatedScenario = await this.prisma.client.scenarioCategory.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        sortOrder: input.sort_order,
        isActive: input.is_active,
        updatedAt: new Date(),
      },
    });

    return ScenarioService.mapToDto(updatedScenario);
  }

  /**
   * 删除场景分类
   */
  async deleteScenario(id: string): Promise<void> {
    // 检查场景分类是否存在
    const existingScenario =
      await this.prisma.client.scenarioCategory.findUnique({
        where: { id },
        include: {
          documents: true,
        },
      });

    if (!existingScenario) {
      throw new NotFoundException("场景分类不存在");
    }

    // 检查是否有相关的文档
    if (existingScenario.documents.length > 0) {
      throw new BadRequestException("该场景分类下存在文档，无法删除");
    }

    await this.prisma.client.scenarioCategory.delete({ where: { id } });
  }

  /**
   * 映射数据库模型到DTO
   */
  public static mapToDto(scenario: SenarioCategoryModel): ScenarioCategoryDto {
    return {
      id: scenario.id,
      business_category_id: scenario.businessCategoryId,
      name: scenario.name,
      description: scenario.description ?? "",
      sort_order: scenario.sortOrder,
      is_active: scenario.isActive,
      created_by: scenario.createdBy ?? "",
      created_at: scenario.createdAt,
      updated_at: scenario.updatedAt,
    };
  }
}
