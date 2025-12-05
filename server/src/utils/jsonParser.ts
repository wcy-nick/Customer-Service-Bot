import fs from 'fs';
import path from 'path';

/**
 * 检查文件是否为JSON格式
 * @param filename 文件名
 * @returns 是否为JSON文件
 */
export function isJSONFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.json');
}

/**
 * 从JSON文件中提取文本内容，特别是针对富文本编辑器格式的JSON
 * @param filePath JSON文件路径
 * @returns 提取的文本内容
 */
export function extractTextFromJSON(filePath: string): string {
  try {
    // 读取JSON文件内容
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    // 存储提取的文本
    const extractedTexts: string[] = [];
    
    // 处理富文本编辑器格式的JSON (delta格式)
    if (data.deltas && typeof data.deltas === 'object') {
      // 遍历所有delta区域
      Object.values(data.deltas).forEach((delta: any) => {
        if (delta.ops && Array.isArray(delta.ops)) {
          // 遍历每个操作，提取文本内容
          delta.ops.forEach((op: any) => {
            if (typeof op.insert === 'string') {
              // 提取文本内容，保留必要的结构信息
              extractedTexts.push(op.insert);
            }
            // 处理带有属性的文本（如标题、粗体等）
            if (op.attributes && op.insert === '*') {
              // 这是一个标记点，可能表示标题开始或列表项
              // 我们可以根据attributes添加一些结构标记
              if (op.attributes.heading === 'h1') {
                extractedTexts.push('\n=== 一级标题 ===\n');
              } else if (op.attributes.heading === 'h2') {
                extractedTexts.push('\n--- 二级标题 ---\n');
              }
            }
          });
        }
      });
    }
    
    // 合并提取的文本
    let mergedText = extractedTexts.join('');
    
    // 清理多余的空行
    mergedText = mergedText.replace(/\n{3,}/g, '\n\n');
    
    // 如果没有提取到内容，尝试返回整个JSON的字符串表示
    if (!mergedText.trim()) {
      mergedText = JSON.stringify(data, null, 2);
    }
    
    return mergedText;
  } catch (error) {
    console.error('JSON解析错误:', error);
    throw new Error(`无法解析JSON文件: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 从JSON文件中提取文本内容，并保留更多的结构信息
 * @param filePath JSON文件路径
 * @returns 提取的结构化文本内容
 */
export function extractStructuredTextFromJSON(filePath: string): string {
  try {
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    // 存储提取的结构化文本
    const structuredTexts: string[] = [];
    let currentSection = '';
    
    // 处理富文本编辑器格式的JSON
    if (data.deltas && typeof data.deltas === 'object') {
      // 遍历所有delta区域
      Object.values(data.deltas).forEach((delta: any) => {
        if (delta.ops && Array.isArray(delta.ops)) {
          let isInHeading = false;
          
          delta.ops.forEach((op: any) => {
            // 处理标题
            if (op.attributes && op.attributes.heading === 'h1' && op.insert === '*') {
              isInHeading = true;
              structuredTexts.push('\n\n# 一级标题');
            } else if (op.attributes && op.attributes.heading === 'h2' && op.insert === '*') {
              isInHeading = true;
              structuredTexts.push('\n\n## 二级标题');
            } 
            // 处理粗体文本（可能是标题内容）
            else if (op.attributes && op.attributes.bold && typeof op.insert === 'string') {
              if (isInHeading) {
                // 如果在标题中，使用标题格式
                structuredTexts.push(` ${op.insert}`);
                isInHeading = false;
              } else {
                // 如果不在标题中，使用粗体标记
                structuredTexts.push(`**${op.insert}**`);
              }
            }
            // 处理列表项标记
            else if (op.attributes && op.attributes.list && op.insert === '*') {
              structuredTexts.push('\n- ');
            }
            // 处理普通文本
            else if (typeof op.insert === 'string') {
              structuredTexts.push(op.insert);
            }
          });
        }
      });
    }
    
    // 合并提取的结构化文本
    let mergedText = structuredTexts.join('');
    
    // 清理和格式化
    mergedText = mergedText
      .replace(/\n{3,}/g, '\n\n')  // 清理多余的空行
      .replace(/# 一级标题 (.*?)\n/g, '# $1\n')  // 优化一级标题格式
      .replace(/## 二级标题 (.*?)\n/g, '## $1\n');  // 优化二级标题格式
    
    return mergedText.trim();
  } catch (error) {
    console.error('JSON结构化文本提取错误:', error);
    throw new Error(`无法从JSON文件提取结构化文本: ${error instanceof Error ? error.message : String(error)}`);
  }
}
