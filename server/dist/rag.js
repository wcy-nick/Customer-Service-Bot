"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitter = void 0;
exports.splitText = splitText;
exports.buildContext = buildContext;
const textsplitters_1 = require("@langchain/textsplitters");
const vectorStore_1 = require("./vectorStore");
exports.splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
});
async function splitText(rawText) {
    return exports.splitter.splitText(rawText);
}
async function buildContext(query, k = 5) {
    const docs = await (0, vectorStore_1.retrieveRelevantChunks)(query, k);
    const context = docs.map((d, i) => `【片段${i + 1}】${d.text}`).join("\n\n");
    return context;
}
