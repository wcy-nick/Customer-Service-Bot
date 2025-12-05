"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFeishuJsonToText = parseFeishuJsonToText;
function parseFeishuJsonToText(json) {
    let finalText = "";
    const zones = json.deltas;
    const zoneIds = Object.keys(zones);
    for (const zoneId of zoneIds) {
        const zone = zones[zoneId];
        const ops = zone.ops;
        for (const op of ops) {
            if (!op.insert)
                continue;
            const text = typeof op.insert === "string" ? op.insert : "";
            const attrs = op.attributes || {};
            // 1. 标题解析
            if (attrs.heading === "h1") {
                finalText += `\n# ${text.trim()}\n\n`;
                continue;
            }
            if (attrs.heading === "h2") {
                finalText += `\n## ${text.trim()}\n\n`;
                continue;
            }
            // 2. 引用
            if (attrs.blockquote) {
                finalText += `> ${text}\n`;
                continue;
            }
            // 3. 列表
            if (attrs.list && attrs.list.startsWith("bullet")) {
                finalText += `- ${text}\n`;
                continue;
            }
            // 4. 粗体
            if (attrs.bold) {
                finalText += `**${text}**`;
                continue;
            }
            // 5. 图片（丢弃）
            if (attrs.IMAGE) {
                // finalText += `[图片略]`;
                continue;
            }
            // 6. 默认文本
            finalText += text;
        }
        finalText += "\n";
    }
    return finalText;
}
