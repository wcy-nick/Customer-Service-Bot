"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vectorStore_1 = require("../src/vectorStore");
async function run() {
    console.log("开始测试向量库内容...");
    // 测试查询关键词
    const testQueries = [
        "招商标准",
        "入驻规范",
        "消费者权益",
        "概述"
    ];
    for (const query of testQueries) {
        console.log(`\n=== 查询: "${query}" ===`);
        try {
            const results = await (0, vectorStore_1.retrieveRelevantChunks)(query, 3);
            if (results.length === 0) {
                console.log("❌ 没有检索到相关结果");
                continue;
            }
            console.log(`✅ 检索到 ${results.length} 条相关结果:`);
            results.forEach((result, index) => {
                console.log(`\n结果 ${index + 1} (相似度: ${(result.score * 100).toFixed(2)}%):`);
                console.log("文本:", result.text.substring(0, 100) + "...");
            });
        }
        catch (error) {
            console.error("❌ 查询失败:", error);
        }
    }
    console.log("\n=== 测试完成 ===");
}
run();
