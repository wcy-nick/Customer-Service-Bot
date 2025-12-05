"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPDF = extractTextFromPDF;
exports.isPDFFile = isPDFFile;
const fs_1 = __importDefault(require("fs"));
// 正确导入pdf-parse模块并使用PDFParse类
const PDFParse = require("pdf-parse").PDFParse;
/**
 * 从PDF文件路径提取文本内容
 * @param filePath PDF文件路径
 * @returns 提取的文本内容
 */
async function extractTextFromPDF(filePath) {
    try {
        const dataBuffer = fs_1.default.readFileSync(filePath);
        const pdfParser = new PDFParse(dataBuffer);
        const data = await pdfParser.parse();
        return data.text;
    }
    catch (error) {
        throw new Error(`PDF解析失败: ${error.message}`);
    }
}
/**
 * 检查文件是否为PDF格式
 * @param filename 文件名
 * @returns 是否为PDF文件
 */
function isPDFFile(filename) {
    const ext = filename.toLowerCase().split(".").pop();
    return ext === "pdf";
}
