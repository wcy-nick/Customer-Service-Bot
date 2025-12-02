import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import type {
  BusinessCategoryDto,
  CreateBusinessCategoryInput,
  UpdateBusinessCategoryInput,
  ScenarioCategoryDto,
} from "./types/types";
import { Prisma } from "@prisma/client";
import { ScenarioService } from "./scenario.service";

interface BusinissCategoryModel {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BusinessCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取业务分类列表
   */
  async getBusinessCategories(
    isActive?: boolean,
  ): Promise<BusinessCategoryDto[]> {
    const whereClause: Prisma.BusinessCategoryWhereInput = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    const categories = await this.prisma.client.businessCategory.findMany({
      where: whereClause,
      orderBy: { sortOrder: "asc" },
    });

    return categories.map((category) => this.mapToDto(category));
  }

  /**
   * 创建业务分类
   */
  async createBusinessCategory(
    input: CreateBusinessCategoryInput,
    userId: string,
  ): Promise<BusinessCategoryDto> {
    // 检查是否存在同名业务分类
    const existingCategory =
      await this.prisma.client.businessCategory.findFirst({
        where: {
          name: input.name,
          isActive: true,
        },
      });

    if (existingCategory) {
      throw new BadRequestException("业务分类名称已存在");
    }

    const category = await this.prisma.client.businessCategory.create({
      data: {
        name: input.name,
        description: input.description,
        icon: input.icon,
        sortOrder: input.sort_order || 0,
        createdBy: userId,
      },
    });

    return this.mapToDto(category);
  }

  /**
   * 更新业务分类
   */
  async updateBusinessCategory(
    id: string,
    input: UpdateBusinessCategoryInput,
  ): Promise<BusinessCategoryDto> {
    // 检查业务分类是否存在
    const existingCategory =
      await this.prisma.client.businessCategory.findUnique({
        where: { id },
      });

    if (!existingCategory) {
      throw new NotFoundException("业务分类不存在");
    }

    // 如果更新名称，检查是否存在同名业务分类
    if (input.name && input.name !== existingCategory.name) {
      const nameExists = await this.prisma.client.businessCategory.findFirst({
        where: {
          name: input.name,
          id: { not: id },
        },
      });

      if (nameExists) {
        throw new BadRequestException("业务分类名称已存在");
      }
    }

    const updatedCategory = await this.prisma.client.businessCategory.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        icon: input.icon,
        sortOrder: input.sort_order,
        isActive: input.is_active,
        updatedAt: new Date(),
      },
    });

    return this.mapToDto(updatedCategory);
  }

  /**
   * 删除业务分类（软删除）
   */
  async deleteBusinessCategory(id: string): Promise<void> {
    // 检查业务分类是否存在
    const existingCategory =
      await this.prisma.client.businessCategory.findUnique({
        where: { id },
        include: {
          scenarios: true,
        },
      });

    if (!existingCategory) {
      throw new NotFoundException("业务分类不存在");
    }

    // 检查是否有相关的场景分类
    if (existingCategory.scenarios.length > 0) {
      throw new BadRequestException("该业务分类下存在场景分类，无法删除");
    }

    await this.prisma.client.businessCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * 获取业务分类的场景列表
   */
  async getBusinessCategoryScenarios(
    businessId: string,
    isActive?: boolean,
  ): Promise<ScenarioCategoryDto[]> {
    // 检查业务分类是否存在
    const businessCategory =
      await this.prisma.client.businessCategory.findUnique({
        where: { id: businessId },
      });

    if (!businessCategory) {
      throw new NotFoundException("业务分类不存在");
    }

    const whereClause: Prisma.ScenarioCategoryWhereInput = {
      businessCategoryId: businessId,
    };

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    const scenarios = await this.prisma.client.scenarioCategory.findMany({
      where: whereClause,
      orderBy: { sortOrder: "asc" },
    });

    return scenarios.map((scenario) => ScenarioService.mapToDto(scenario));
  }

  /**
   * 映射业务分类数据库模型到DTO
   */
  private mapToDto(category: BusinissCategoryModel): BusinessCategoryDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      icon: category.icon ?? "",
      sort_order: category.sortOrder,
      is_active: category.isActive,
      created_by: category.createdBy ?? "",
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    };
  }
}
