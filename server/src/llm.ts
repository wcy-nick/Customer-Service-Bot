import { ChatZhipuAI } from "@langchain/community/chat_models/zhipuai";
import config from "./config.js";

export function createChatModel() {
  if (!config.zhipuApiKey) {
    throw new Error("ZHIPU_API_KEY is not set");
  }
  return new ChatZhipuAI({
    apiKey: config.zhipuApiKey,
    model: "glm-4",
  });
}
