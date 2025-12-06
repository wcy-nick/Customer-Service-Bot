import { Injectable } from "@nestjs/common";
import { QdrantService } from "./qdrant.service";
import {
  SearchResultDto,
  SemanticSearchQuery,
  RelatedQuestionsRequest,
} from "./types/types";

@Injectable()
export class SearchService {
  constructor(private readonly qdrantService: QdrantService) {}

  /**
   * 语义搜索功能
   * @param query 搜索参数
   * @returns 搜索结果列表和总数
   */
  async semanticSearch(
    userId: string,
    query: SemanticSearchQuery,
  ): Promise<{ results: SearchResultDto[]; total: number }> {
    const { query: searchQuery, limit = 10, threshold = 0.5 } = query;

    // 从向量数据库获取相关文档片段
    const relevantChunks = await this.qdrantService.retrieveRelevantChunks(
      userId,
      searchQuery,
      { limit },
    );

    // 应用阈值过滤
    const filteredResults = relevantChunks.filter(
      (result) => result.score >= threshold,
    );

    return {
      results: filteredResults,
      total: filteredResults.length,
    };
  }

  /**
   * 相关问题推荐
   * @param request 请求参数，包含用户问题
   * @returns 相关问题列表
   */
  async getRelatedQuestions(
    userId: string,
    request: RelatedQuestionsRequest,
  ): Promise<{ questions: string[] }> {
    const { question } = request;

    // 这里是相关问题推荐的实现
    // 实际项目中，可能需要使用更复杂的算法或模型
    // 这里暂时使用简单的逻辑来演示

    // 1. 首先进行语义搜索，获取相关文档片段
    await this.qdrantService.retrieveRelevantChunks(userId, question);

    // 2. 从相关文档中提取或生成相关问题
    // 实际项目中，可能需要使用LLM来生成相关问题
    // 这里暂时返回模拟数据
    const relatedQuestions = [
      "这是什么问题的解决方案？",
      "如何使用这个功能？",
      "有没有类似的案例？",
      "这个功能的优势是什么？",
      "有没有更多相关信息？",
    ];

    return {
      questions: relatedQuestions,
    };
  }
}
