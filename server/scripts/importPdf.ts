#!/usr/bin/env ts-node
import fs from "fs";
import path from "path";
import { extractImagesFromPdf } from "../src/pdf/extractImages";
import { ocrImage, OCRConfig } from "../src/pdf/ocr";
import { splitText } from "../src/rag";
import { upsertDocuments } from "../src/vectorStore";

/**
 * 一键导入PDF文件到向量库
 * 流程：PDF → 提取图像 → OCR识别文字 → Embedding → 写入向量库
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    if (args.length < 1) {
      console.log("用法: npx ts-node scripts/importPdf.ts <pdf文件路径> [--ocr-type <paddleocr|tesseract>] [--paddle-url <url>]");
      console.log("示例:");
      console.log("  npx ts-node scripts/importPdf.ts ./docs/example.pdf");
      console.log("  npx ts-node scripts/importPdf.ts ./docs/example.pdf --ocr-type paddleocr --paddle-url http://127.0.0.1:9898/paddle/ocr");
      process.exit(1);
    }
    
    const pdfPath = args[0];
    
    // 检查文件是否存在
    if (!fs.existsSync(pdfPath)) {
      console.error(`错误: 文件不存在 - ${pdfPath}`);
      process.exit(1);
    }
    
    // 检查文件是否为PDF
    if (!pdfPath.toLowerCase().endsWith(".pdf")) {
      console.error(`错误: 文件不是PDF格式 - ${pdfPath}`);
      process.exit(1);
    }
    
    // 解析OCR参数
    const ocrTypeIndex = args.indexOf("--ocr-type");
    const paddleUrlIndex = args.indexOf("--paddle-url");
    
    const ocrConfig: OCRConfig = {
      type: "paddleocr", // 默认使用paddleocr
      paddleOcrUrl: "http://127.0.0.1:9898/paddle/ocr" // 默认地址
    };
    
    if (ocrTypeIndex > -1 && args.length > ocrTypeIndex + 1) {
      const type = args[ocrTypeIndex + 1];
      if (type === "paddleocr" || type === "tesseract") {
        ocrConfig.type = type;
      } else {
        console.error(`警告: 不支持的OCR类型 - ${type}，使用默认的paddleocr`);
      }
    }
    
    if (paddleUrlIndex > -1 && args.length > paddleUrlIndex + 1) {
      ocrConfig.paddleOcrUrl = args[paddleUrlIndex + 1];
    }
    
    console.log("=== PDF导入向量库流程 ===");
    console.log(`PDF文件: ${pdfPath}`);
    console.log(`OCR类型: ${ocrConfig.type}`);
    if (ocrConfig.type === "paddleocr") {
      console.log(`PaddleOCR地址: ${ocrConfig.paddleOcrUrl}`);
    }
    console.log("========================\n");
    
    // 1. 提取PDF中的图像
    console.log("1) 正在从PDF中提取图像...");
    const tempDir = path.join(process.cwd(), "temp", "pdf-images", Date.now().toString());
    const images = await extractImagesFromPdf(pdfPath, tempDir);
    
    if (images.length === 0) {
      console.log("警告: 未从PDF中提取到图像，可能是纯文本PDF");
      console.log("尝试使用传统方式提取文本...");
      
      // 如果没有提取到图像，使用传统方式提取文本
      const PDFParse = require("pdf-parse").PDFParse;
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfParser = new PDFParse(dataBuffer);
      const data = await pdfParser.parse();
      const text = data.text;
      
      if (!text.trim()) {
        console.error("错误: 无法从PDF中提取任何文本");
        process.exit(1);
      }
      
      console.log(`成功提取文本，长度: ${text.length} 字符`);
      
      // 3. 文本分割
      const chunks = await splitText(text);
      
      // 4. 向量化并写入向量库
      await upsertDocuments(chunks);
      
      console.log(`\n✅ 导入完成！成功处理 ${chunks.length} 个文本片段`);
      
      return;
    }
    
    console.log(`成功提取 ${images.length} 张图像`);
    
    // 2. 对每张图像进行OCR识别
    console.log("\n2) 正在进行OCR文字识别...");
    const allText: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const imgPath = images[i];
      console.log(`  处理图像 ${i + 1}/${images.length}: ${path.basename(imgPath)}`);
      
      try {
        const text = await ocrImage(imgPath, ocrConfig);
        if (text.trim()) {
          allText.push(text);
        }
      } catch (error) {
        console.error(`  ❌ 处理失败:`, error);
      }
    }
    
    // 清理临时目录
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("清理临时目录失败:", cleanupError);
    }
    
    if (allText.length === 0) {
      console.error("错误: OCR识别结果为空");
      process.exit(1);
    }
    
    // 合并所有识别的文本
    const resultText = allText.join("\n\n");
    console.log(`\n成功识别文本，总长度: ${resultText.length} 字符`);
    
    // 3. 文本分割
    console.log("\n3) 正在进行文本分割...");
    const chunks = await splitText(resultText);
    console.log(`成功分割为 ${chunks.length} 个文本片段`);
    
    // 4. 向量化并写入向量库
    console.log("\n4) 正在进行向量化并写入向量库...");
    await upsertDocuments(chunks);
    
    console.log(`\n✅ 导入完成！`);
    console.log(`  PDF文件: ${pdfPath}`);
    console.log(`  处理图像数: ${images.length}`);
    console.log(`  识别文本长度: ${resultText.length} 字符`);
    console.log(`  生成文本片段: ${chunks.length} 个`);
    console.log(`  成功写入向量库`);
    
  } catch (error) {
    console.error("❌ 处理过程中发生错误:", error);
    process.exit(1);
  }
}

// 运行脚本
main();
