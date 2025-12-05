"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZhipuEmbedding = void 0;
const zhipuai_1 = require("@langchain/community/embeddings/zhipuai");
const config_1 = require("../config");
/**
 * 封装 LangChain 的 ZhipuAIEmbeddings，提供统一的接口
 */
class ZhipuEmbedding {
    constructor(options) {
        const apiKey = options?.apiKey || config_1.ZHIPU_API_KEY;
        const model = options?.model || config_1.EMBEDDING_MODEL;
        if (!apiKey) {
            throw new Error("ZHIPU_API_KEY is not set");
        }
        // 检查 API Key 格式
        // 智谱 AI 的 API Key 通常是 "xxx.yyy" 格式（包含点号）
        // 或者可能是 "zhipu-xxx" 格式
        console.log("Initializing ZhipuAIEmbeddings with API Key:", apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 5));
        console.log("Model:", model);
        // 使用 LangChain 官方的 ZhipuAIEmbeddings
        // 注意：LangChain 的模型名称可能是 "embedding-2" 或 "embedding-3"
        // 如果使用 bge-small-zh，映射到 embedding-2（默认）
        let modelName = undefined;
        if (model === "bge-small-zh" || model === "embedding-2") {
            modelName = "embedding-2";
        }
        else if (model === "embedding-3") {
            modelName = "embedding-3";
        }
        // 如果模型名称不是标准的，让 LangChain 使用默认值
        try {
            this.embeddings = new zhipuai_1.ZhipuAIEmbeddings({
                apiKey: apiKey,
                modelName: modelName,
            });
            console.log("ZhipuAIEmbeddings initialized successfully");
        }
        catch (error) {
            console.error("Failed to initialize ZhipuAIEmbeddings:", error);
            throw new Error(`Failed to initialize embeddings: ${error.message}`);
        }
    }
    async embed(texts) {
        try {
            console.log(`Embedding ${texts.length} text(s), first text preview:`, texts[0]?.substring(0, 50) + "...");
            // LangChain 的 embedDocuments 方法返回 Promise<number[][]>
            const embeddings = await this.embeddings.embedDocuments(texts);
            console.log(`Successfully embedded ${embeddings.length} text(s), embedding dimension: ${embeddings[0]?.length}`);
            return embeddings;
        }
        catch (error) {
            console.error("Zhipu embedding error details:", {
                message: error.message,
                stack: error.stack,
                response: error.response?.data || error.response || "No response data",
                status: error.status || error.response?.status,
            });
            // 提供更详细的错误信息
            let errorMessage = `Zhipu embedding failed: ${error.message}`;
            if (error.response?.data) {
                errorMessage += ` - Response: ${JSON.stringify(error.response.data)}`;
            }
            throw new Error(errorMessage);
        }
    }
    async embedOne(text) {
        try {
            console.log("Embedding single text, preview:", text.substring(0, 50) + "...");
            // LangChain 的 embedQuery 方法返回 Promise<number[]>
            const embedding = await this.embeddings.embedQuery(text);
            console.log(`Successfully embedded text, dimension: ${embedding.length}`);
            return embedding;
        }
        catch (error) {
            console.error("Zhipu embedding error details:", {
                message: error.message,
                stack: error.stack,
                response: error.response?.data || error.response || "No response data",
                status: error.status || error.response?.status,
            });
            // 提供更详细的错误信息
            let errorMessage = `Zhipu embedding failed: ${error.message}`;
            if (error.response?.data) {
                errorMessage += ` - Response: ${JSON.stringify(error.response.data)}`;
            }
            throw new Error(errorMessage);
        }
    }
}
exports.ZhipuEmbedding = ZhipuEmbedding;
