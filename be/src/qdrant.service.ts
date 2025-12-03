import { Injectable, OnModuleInit } from "@nestjs/common";
import { QdrantClient } from "@qdrant/js-client-rest";
import { randomUUID } from "crypto";
import config from "./config";
import { ZhipuEmbedding } from "./embedding/zhipuEmbedding";

export interface DocumentChunk {
  id: string;
  content: string;
  businessCategoryId?: string;
  documentId: string;
}

export interface RetrievedChunk extends DocumentChunk {
  score: number;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;
  private embedding: ZhipuEmbedding;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      host: process.env.QDRANT_HOST,
      port: Number(process.env.QDRANT_PORT),
      apiKey: process.env.QDRANT_API_KEY,
    });

    this.embedding = new ZhipuEmbedding();
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  async ensureCollection() {
    const exists = await this.client
      .getCollection(config.qdrantCollection)
      .then(
        () => true,
        () => false,
      );

    if (!exists) {
      await this.client.createCollection(config.qdrantCollection, {
        vectors: {
          size: 1024,
          distance: "Cosine",
        },
      });
    }
  }

  async upsertDocuments(documents: DocumentChunk[]): Promise<void> {
    // 使用embed方法获取嵌入向量
    const texts = documents.map((doc) => doc.content);
    const vectors = await this.embedding.embed(texts);

    // 创建points数组
    const points = documents.map((doc, idx) => ({
      id: doc.id || randomUUID(),
      vector: vectors[idx],
      payload: {
        text: doc.content,
        metadata: {
          businessCategoryId: doc.businessCategoryId,
          documentId: doc.documentId,
        },
      },
    }));

    // 修复Qdrant客户端调用格式
    await this.client.upsert(config.qdrantCollection, {
      wait: true,
      points,
    });
  }

  async retrieveRelevantChunks(
    query: string,
    limit: number = 5,
  ): Promise<RetrievedChunk[]> {
    // 使用embedOne方法获取查询向量
    const queryVec = await this.embedding.embedOne(query);

    // 修复Qdrant客户端搜索调用格式
    const results = await this.client.search(config.qdrantCollection, {
      vector: queryVec,
      limit,
    });

    // 转换结果
    return results.map((result) => {
      const metadata = result.payload?.metadata as
        | {
            businessCategoryId: string;
            documentId: string;
          }
        | undefined;
      return {
        id: result.id.toString(),
        score: result.score,
        content: result.payload?.text as string,
        businessCategoryId: metadata?.businessCategoryId || "",
        documentId: metadata?.documentId || "",
      };
    });
  }

  async buildContext(query: string, k = 5): Promise<string> {
    const docs = await this.retrieveRelevantChunks(query, k);
    const context = docs
      .map((d, i) => `【片段${i + 1}】${d.content}`)
      .join("\n\n");
    return context;
  }
}
