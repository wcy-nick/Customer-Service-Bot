import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { retrieveRelevantChunks } from "./vectorStore.js";

export const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 100,
});

export async function splitText(rawText: string): Promise<string[]> {
  return splitter.splitText(rawText);
}

export async function buildContext(query: string, k = 5): Promise<string> {
  const docs = await retrieveRelevantChunks(query, k);
  const context = docs.map((d, i) => `【片段${i + 1}】${d.text}`).join("\n\n");
  return context;
}




