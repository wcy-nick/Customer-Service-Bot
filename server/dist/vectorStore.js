"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qdrantClient = void 0;
exports.ensureCollection = ensureCollection;
exports.upsertDocuments = upsertDocuments;
exports.retrieveRelevantChunks = retrieveRelevantChunks;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const config_1 = require("./config");
const zhipuEmbedding_1 = require("./embedding/zhipuEmbedding");
const crypto_1 = require("crypto");
exports.qdrantClient = new js_client_rest_1.QdrantClient({
    url: config_1.QDRANT_URL,
});
const embedding = new zhipuEmbedding_1.ZhipuEmbedding();
async function ensureCollection() {
    const exists = await exports.qdrantClient.getCollection(config_1.QDRANT_COLLECTION).then(() => true, () => false);
    if (!exists) {
        await exports.qdrantClient.createCollection(config_1.QDRANT_COLLECTION, {
            vectors: {
                size: 1024,
                distance: "Cosine",
            },
        });
    }
}
async function upsertDocuments(chunks) {
    await ensureCollection();
    const vectors = await embedding.embed(chunks);
    // Qdrant 要求 ID 必须是无符号整数或 UUID
    // 使用 UUID 确保唯一性
    const points = vectors.map((vec, idx) => ({
        id: (0, crypto_1.randomUUID)(),
        vector: vec,
        payload: {
            text: chunks[idx],
        },
    }));
    await exports.qdrantClient.upsert(config_1.QDRANT_COLLECTION, {
        wait: true,
        points,
    });
}
async function retrieveRelevantChunks(query, k = 5) {
    await ensureCollection();
    const queryVec = await embedding.embedOne(query);
    const res = await exports.qdrantClient.search(config_1.QDRANT_COLLECTION, {
        vector: queryVec,
        limit: k,
    });
    return res.map((pt) => ({
        text: pt.payload?.text,
        score: pt.score ?? 0,
    }));
}
