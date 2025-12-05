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
exports.extractImagesFromPdf = extractImagesFromPdf;
/**
 * PDF图像提取功能
 * 注意：由于pdfjs-dist在Node.js环境下的图像提取API较为复杂且易出错，
 * 我们目前提供一个简化版本，主要用于演示流程。
 * 实际使用中，可以根据需要扩展此功能。
 */
const fs_1 = __importDefault(require("fs"));
const pdfjsLib = __importStar(require("pdfjs-dist"));
// 设置Worker（Node.js环境下需要）
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.entry.js");
/**
 * 从PDF文件中提取图像（简化版）
 * @param pdfPath PDF文件路径
 * @param outputDir 图像输出目录
 * @returns 提取的图像文件路径数组
 */
async function extractImagesFromPdf(pdfPath, outputDir) {
    // 确保输出目录存在
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    console.warn("警告：当前PDF图像提取功能为简化版本，可能无法提取所有图像。");
    console.warn("建议：如果需要完整的图像提取功能，建议使用专业的PDF处理工具或服务。");
    // 返回空数组，表示没有提取到图像
    return [];
}
