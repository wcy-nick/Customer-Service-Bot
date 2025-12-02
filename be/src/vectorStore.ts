import { QdrantClient } from "@qdrant/js-client-rest";
import { randomUUID } from "crypto";
import config from "./config.js";
import { ZhipuEmbedding } from "./embedding/zhipuEmbedding.js";

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  host: process.env.QDRANT_HOST,
  port: Number(process.env.QDRANT_PORT),
  apiKey: process.env.QDRANT_API_KEY,
});

const embedding = new ZhipuEmbedding();

export async function ensureCollection() {
  const exists = await qdrantClient.getCollection(config.qdrantCollection).then(
    () => true,
    () => false,
  );
  if (!exists) {
    await qdrantClient.createCollection(config.qdrantCollection, {
      vectors: {
        size: 1024,
        distance: "Cosine",
      },
    });
  }
}

export async function upsertDocuments(chunks: string[]) {
  await ensureCollection();
  const vectors = await embedding.embed(chunks);

  // Qdrant 要求 ID 必须是无符号整数或 UUID
  // 使用 UUID 确保唯一性
  const points = vectors.map((vec, idx) => ({
    id: randomUUID(),
    vector: vec,
    payload: {
      text: chunks[idx],
    },
  }));

  await qdrantClient.upsert(config.qdrantCollection, {
    wait: true,
    points,
  });
}

export interface RetrievedChunk {
  text: string;
  score: number;
}

export async function retrieveRelevantChunks(
  query: string,
  k = 5,
): Promise<RetrievedChunk[]> {
  await ensureCollection();
  const queryVec = await embedding.embedOne(query);
  const res = await qdrantClient.search(config.qdrantCollection, {
    vector: queryVec,
    limit: k,
  });

  return res.map((pt) => ({
    text: (pt.payload as { text: string }).text,
    score: pt.score ?? 0,
  }));
}
