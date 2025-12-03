import { Controller, Get, Post, Query, Body } from "@nestjs/common";
import { SearchService } from "./search.service";
import type {
  SemanticSearchQuery,
  RelatedQuestionsRequest,
  SearchResultDto,
} from "./types/types";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";

@ApiTags("search")
@Controller("api/chat")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 语义搜索接口
   * @param query 搜索参数
   * @returns 搜索结果列表和总数
   */
  @ApiOperation({ summary: "语义搜索接口" })
  @ApiQuery({ name: "q", type: String, description: "搜索关键词" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回结果数量",
  })
  @ApiQuery({
    name: "min_score",
    required: false,
    type: Number,
    description: "最小匹配分数",
  })
  @ApiResponse({
    status: 200,
    description: "搜索结果列表和总数",
    schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "文档ID" },
              title: { type: "string", description: "文档标题" },
              content: { type: "string", description: "匹配的内容片段" },
              score: { type: "number", description: "匹配分数" },
              document_type: { type: "string", description: "文档类型" },
            },
          },
        },
        total: { type: "number", description: "匹配的总结果数" },
      },
    },
  })
  @Get("semantic-search")
  async semanticSearch(
    @Query() query: SemanticSearchQuery,
  ): Promise<{ results: SearchResultDto[]; total: number }> {
    return this.searchService.semanticSearch(query);
  }

  /**
   * 相关问题推荐接口
   * @param request 请求参数，包含用户问题
   * @returns 相关问题列表
   */
  @ApiOperation({ summary: "相关问题推荐接口" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "用户问题",
          example: "如何修改密码？",
        },
        count: { type: "number", description: "推荐问题数量", example: 5 },
      },
      required: ["question"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "相关问题列表",
    schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: { type: "string" },
          description: "相关问题列表",
        },
      },
    },
  })
  @Post("related-questions")
  async getRelatedQuestions(
    @Body() request: RelatedQuestionsRequest,
  ): Promise<{ questions: string[] }> {
    return this.searchService.getRelatedQuestions(request);
  }
}
