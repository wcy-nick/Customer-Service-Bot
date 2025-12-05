"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocrImage = ocrImage;
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
/**
 * 对图像进行OCR识别
 * @param imgPath 图像文件路径
 * @param config OCR配置
 * @returns 识别出的文本
 */
async function ocrImage(imgPath, config = { type: "paddleocr" }) {
    if (config.type === "paddleocr") {
        return ocrWithPaddleOCR(imgPath, config.paddleOcrUrl || "http://127.0.0.1:9898/paddle/ocr");
    }
    else {
        return ocrWithTesseract(imgPath);
    }
}
/**
 * 使用PaddleOCR进行图像识别
 * @param imgPath 图像文件路径
 * @param apiUrl PaddleOCR服务地址
 * @returns 识别出的文本
 */
async function ocrWithPaddleOCR(imgPath, apiUrl) {
    try {
        // 读取图像文件
        const buffer = fs_1.default.readFileSync(imgPath);
        // 调用PaddleOCR服务
        const response = await axios_1.default.post(apiUrl, buffer, { headers: { "Content-Type": "application/octet-stream" } });
        // 解析OCR结果
        let text = "";
        if (Array.isArray(response.data)) {
            // 处理数组格式的结果
            for (const line of response.data) {
                if (line.text) {
                    text += line.text + "\n";
                }
                else if (Array.isArray(line)) {
                    // 处理嵌套数组格式
                    for (const item of line) {
                        if (item.text) {
                            text += item.text + "\n";
                        }
                    }
                }
            }
        }
        else if (typeof response.data === "object" && response.data !== null) {
            // 处理对象格式的结果
            if (response.data.text) {
                text = response.data.text;
            }
            else if (response.data.data) {
                return ocrWithPaddleOCR(imgPath, apiUrl); // 递归处理
            }
        }
        return text.trim();
    }
    catch (error) {
        console.error("PaddleOCR识别失败:", error);
        throw new Error(`PaddleOCR识别失败: ${error.message}`);
    }
}
/**
 * 使用Tesseract.js进行图像识别
 * @param imgPath 图像文件路径
 * @returns 识别出的文本
 */
async function ocrWithTesseract(imgPath) {
    try {
        // 动态导入tesseract.js（仅在需要时加载）
        const { createWorker } = await Promise.resolve().then(() => __importStar(require("tesseract.js")));
        // 创建worker并执行识别
        const worker = await createWorker();
        try {
            // 执行OCR识别
            const { data: { text } } = await worker.recognize(imgPath);
            return text.trim();
        }
        finally {
            // 确保worker被终止
            await worker.terminate();
        }
    }
    catch (error) {
        console.error("Tesseract.js识别失败:", error);
        throw new Error(`Tesseract.js识别失败: ${error.message}`);
    }
}
