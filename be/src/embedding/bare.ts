import { HttpException, HttpStatus } from "@nestjs/common";
import axios from "axios";

export abstract class BareEmbeddingService {
  protected abstract readonly apiUrl: string;
  protected abstract readonly apiKey: string;
  protected abstract readonly model: string;
  protected abstract readonly dimensions: number;

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const response: { data: { data: { embedding: number[] }[] } } =
        await axios.post(
          this.apiUrl,
          {
            model: this.model,
            input: texts,
            encoding_format: "float",
            dimensions: this.dimensions,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
          },
        );

      // 确保响应结构正确
      if (!response.data || !response.data.data) {
        throw new Error("Invalid API response structure");
      }

      // 提取嵌入向量
      return response.data.data.map((item) => item.embedding);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          `Embedding API error: ${error.message}`,
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `Embedding error: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    // 调用embedDocuments并返回第一个结果
    const embeddings = await this.embedDocuments([text]);
    return embeddings[0];
  }
}
