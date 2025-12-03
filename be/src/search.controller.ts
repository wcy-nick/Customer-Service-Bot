import { Controller, Get, Post, Query, Body } from "@nestjs/common";
import { SearchService } from "./search.service";
import type {
  SemanticSearchQuery,
  RelatedQuestionsRequest,
  SearchResultDto,
} from "./types/types";

@Controller("api/chat")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 语义搜索接口
   * @param query 搜索参数
   * @returns 搜索结果列表和总数
   */
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
  @Post("related-questions")
  async getRelatedQuestions(
    @Body() request: RelatedQuestionsRequest,
  ): Promise<{ questions: string[] }> {
    return this.searchService.getRelatedQuestions(request);
  }
}
