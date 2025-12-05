import fs from "fs";
import axios from "axios";

/**
 * OCR配置接口
 */
export interface OCRConfig {
  /** OCR类型：paddleocr 或 tesseract */
  type: "paddleocr" | "tesseract";
  /** PaddleOCR服务地址（仅当type为paddleocr时使用） */
  paddleOcrUrl?: string;
}

/**
 * 对图像进行OCR识别
 * @param imgPath 图像文件路径
 * @param config OCR配置
 * @returns 识别出的文本
 */
export async function ocrImage(imgPath: string, config: OCRConfig = { type: "paddleocr" }): Promise<string> {
  if (config.type === "paddleocr") {
    return ocrWithPaddleOCR(imgPath, config.paddleOcrUrl || "http://127.0.0.1:9898/paddle/ocr");
  } else {
    return ocrWithTesseract(imgPath);
  }
}

/**
 * 使用PaddleOCR进行图像识别
 * @param imgPath 图像文件路径
 * @param apiUrl PaddleOCR服务地址
 * @returns 识别出的文本
 */
async function ocrWithPaddleOCR(imgPath: string, apiUrl: string): Promise<string> {
  try {
    // 读取图像文件
    const buffer = fs.readFileSync(imgPath);
    
    // 调用PaddleOCR服务
    const response = await axios.post(
      apiUrl,
      buffer,
      { headers: { "Content-Type": "application/octet-stream" } }
    );
    
    // 解析OCR结果
    let text = "";
    
    if (Array.isArray(response.data)) {
      // 处理数组格式的结果
      for (const line of response.data) {
        if (line.text) {
          text += line.text + "\n";
        } else if (Array.isArray(line)) {
          // 处理嵌套数组格式
          for (const item of line) {
            if (item.text) {
              text += item.text + "\n";
            }
          }
        }
      }
    } else if (typeof response.data === "object" && response.data !== null) {
      // 处理对象格式的结果
      if (response.data.text) {
        text = response.data.text;
      } else if (response.data.data) {
        return ocrWithPaddleOCR(imgPath, apiUrl); // 递归处理
      }
    }
    
    return text.trim();
  } catch (error) {
    console.error("PaddleOCR识别失败:", error);
    throw new Error(`PaddleOCR识别失败: ${(error as Error).message}`);
  }
}

/**
 * 使用Tesseract.js进行图像识别
 * @param imgPath 图像文件路径
 * @returns 识别出的文本
 */
async function ocrWithTesseract(imgPath: string): Promise<string> {
  try {
    // 动态导入tesseract.js（仅在需要时加载）
    const { createWorker } = await import("tesseract.js");
    
    // 创建worker并执行识别
    const worker = await createWorker();
    
    try {
      // 执行OCR识别
      const { data: { text } } = await worker.recognize(imgPath);
      
      return text.trim();
    } finally {
      // 确保worker被终止
      await worker.terminate();
    }
  } catch (error) {
    console.error("Tesseract.js识别失败:", error);
    throw new Error(`Tesseract.js识别失败: ${(error as Error).message}`);
  }
}
