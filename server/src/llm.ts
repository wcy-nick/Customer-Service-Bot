import { ChatZhipuAI } from "@langchain/community/chat_models/zhipuai";
import { ZHIPU_API_KEY } from "./config";

export function createChatModel() {
  if (!ZHIPU_API_KEY) {
    throw new Error("ZHIPU_API_KEY is not set");
  }
  return new ChatZhipuAI({
    apiKey: ZHIPU_API_KEY,
    model: "glm-4",
  });
}




