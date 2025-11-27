import fs from "fs";
import pdfParse = require("pdf-parse");

/**
 * 从PDF文件路径提取文本内容
 * @param filePath PDF文件路径
 * @returns 提取的文本内容
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error: any) {
    throw new Error(`PDF解析失败: ${error.message}`);
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

