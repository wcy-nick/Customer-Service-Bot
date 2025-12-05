import fs from "fs";
// 正确导入pdf-parse模块并使用PDFParse类
const PDFParse = require("pdf-parse").PDFParse;
import { extractImagesFromPdf } from "../pdf/extractImages";
import { ocrImage, OCRConfig } from "../pdf/ocr";
import path from "path";

/**
 * 从PDF文件路径提取文本内容（传统方式）
 * @param filePath PDF文件路径
 * @returns 提取的文本内容
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfParser = new PDFParse(dataBuffer);
    const data = await pdfParser.parse();
    return data.text;
  } catch (error: any) {
    throw new Error(`PDF解析失败: ${error.message}`);
  }
}

/**
 * 从PDF文件路径提取文本内容（OCR方式）
 * @param filePath PDF文件路径
 * @param ocrConfig OCR配置选项
 * @returns 提取的文本内容
 */
export async function extractTextFromPDFForOCR(filePath: string, ocrConfig: OCRConfig): Promise<string> {
  try {
    // 创建临时目录存储提取的图像
    const tempDir = path.join(process.cwd(), "temp", "pdf-images", Date.now().toString());
    
    // 提取PDF中的图像
    const images = await extractImagesFromPdf(filePath, tempDir);
    
    if (images.length === 0) {
      console.log("未从PDF中提取到图像，使用传统方式提取文本");
      return extractTextFromPDF(filePath);
    }
    
    console.log(`从PDF中提取到 ${images.length} 张图像，开始OCR识别...`);
    
    // 对每张图像进行OCR识别
    const allText: string[] = [];
    for (const imgPath of images) {
      try {
        const text = await ocrImage(imgPath, ocrConfig);
        if (text.trim()) {
          allText.push(text);
        }
      } catch (error) {
        console.error(`处理图像 ${imgPath} 失败:`, error);
        // 继续处理其他图像
      }
    }
    
    // 清理临时目录
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("清理临时目录失败:", cleanupError);
    }
    
    // 合并所有识别的文本
    const result = allText.join("\n\n");
    
    if (!result.trim()) {
      console.log("OCR识别结果为空，使用传统方式提取文本");
      return extractTextFromPDF(filePath);
    }
    
    console.log(`OCR识别完成，提取文本长度: ${result.length} 字符`);
    return result;
    
  } catch (error: any) {
    console.error("PDF OCR处理失败，使用传统方式提取文本:", error);
    // 失败时回退到传统方式
    return extractTextFromPDF(filePath);
  }
}

/**
 * 检查文件是否为PDF格式
 * @param filename 文件名
 * @returns 是否为PDF文件
 */
export function isPDFFile(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop();
  return ext === "pdf";
}

