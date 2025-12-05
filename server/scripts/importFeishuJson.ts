import fs from "fs";
import path from "path";
import { parseFeishuJsonToText } from "../src/utils/parseFeishuDelta";
import { splitText } from "../src/rag";
import { upsertDocuments } from "../src/vectorStore";

async function run() {
  // 从uploads目录中读取JSON文件
  // 使用path.join创建跨平台兼容的绝对路径
  const jsonPath = path.join("c:", "VScode", "new", "ai", "server", "uploads", "1764329398943-knowledge.json");
  
  console.log(`开始处理JSON文件: ${jsonPath}`);
  
  // 检查文件是否存在
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ 文件不存在:", jsonPath);
    return;
  }
  
  // 读取JSON文件
  const raw = fs.readFileSync(jsonPath, "utf8");
  const json = JSON.parse(raw);
  
  console.log("✅ JSON文件读取成功");
  
  // 1. JSON → 连贯文本
  console.log("开始解析JSON为文本...");
  const text = parseFeishuJsonToText(json);
  console.log(`✅ 文本解析完成，总长度: ${text.length} 字符`);
  
  // 2. 文本分割
  console.log("开始分割文本...");
  const chunks = await splitText(text);
  console.log(`✅ 文本分割完成，共分割为 ${chunks.length} 个块`);
  
  // 3. 生成Embedding并写入向量数据库
  console.log("开始生成Embedding并写入向量库...");
  await upsertDocuments(chunks);
  
  console.log("🎉 文档入库完成！");
  console.log(`📄 总文本长度: ${text.length} 字符`);
  console.log(`🧩 分割为 ${chunks.length} 个块`);
  console.log(`📚 所有块已成功存入向量库`);
}

run().catch((error) => {
  console.error("❌ 处理失败:", error);
  process.exit(1);
});