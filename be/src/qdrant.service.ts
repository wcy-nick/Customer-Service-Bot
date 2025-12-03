import { Injectable, OnModuleInit } from "@nestjs/common";
import { QdrantClient } from "@qdrant/js-client-rest";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { ZhipuEmbeddingService } from "./embedding/zhipu";

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
  private readonly qdrantCollection: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingService: ZhipuEmbeddingService,
  ) {
    this.client = new QdrantClient({
      url: this.configService.get<string>("QDRANT_URL"),
      host: this.configService.get<string>("QDRANT_HOST"),
      port: this.configService.get<number>("QDRANT_PORT"),
      apiKey: this.configService.get<string>("QDRANT_API_KEY"),
    });

    this.qdrantCollection =
      this.configService.get<string>("QDRANT_COLLECTION") || "documents";
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  async ensureCollection() {
    const exists = await this.client.getCollection(this.qdrantCollection).then(
      () => true,
      () => false,
    );

    if (!exists) {
      await this.client.createCollection(this.qdrantCollection, {
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
    const vectors = await this.embeddingService.embedDocuments(texts);

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
    await this.client.upsert(this.qdrantCollection, {
      wait: true,
      points,
    });
  }

  async retrieveRelevantChunks(
    query: string,
    limit: number = 5,
  ): Promise<RetrievedChunk[]> {
    const queryVec = await this.embeddingService.embedQuery(query);

    // 修复Qdrant客户端搜索调用格式
    const results = await this.client.search(this.qdrantCollection, {
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

  async buildContext(
    query: string,
    k = 5,
    minScore = 0.5,
    maxLength = 2000,
  ): Promise<string> {
    const docs = await this.retrieveRelevantChunks(query, k);

    // 1. 过滤掉相似度分数过低的结果
    const filteredDocs = docs.filter((doc) => doc.score >= minScore);

    // 2. 内容去重（基于content字段）
    const uniqueDocsMap = new Map<string, RetrievedChunk>();
    filteredDocs.forEach((doc) => {
      if (!uniqueDocsMap.has(doc.content)) {
        uniqueDocsMap.set(doc.content, doc);
      }
    });
    const uniqueDocs = Array.from(uniqueDocsMap.values());

    // 3. 构建带有元数据的上下文
    const context: string[] = [];
    let totalLength = 0;

    for (let i = 0; i < uniqueDocs.length; i++) {
      const doc = uniqueDocs[i];
      const metadataInfo =
        doc.documentId || doc.businessCategoryId
          ? `(来源: 文档ID=${doc.documentId}, 分类ID=${doc.businessCategoryId})`
          : "";

      const chunkWithContext = `【片段${i + 1}】${metadataInfo}\n相似度: ${doc.score.toFixed(3)}\n${doc.content}`;
      const chunkLength = chunkWithContext.length;

      // 4. 控制上下文总长度
      if (totalLength + chunkLength > maxLength) {
        break; // 达到最大长度限制，停止添加更多片段
      }
      context.push(chunkWithContext);
      totalLength += chunkLength + 2; // +2 for the newline characters
    }

    // 5. 处理空结果情况
    if (!context.length) {
      return "没有找到相关的文档片段。";
    }

    return context.join("\n".repeat(2));
  }
}
