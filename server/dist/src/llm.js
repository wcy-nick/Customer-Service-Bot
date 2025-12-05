"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatModel = createChatModel;
const zhipuai_1 = require("@langchain/community/chat_models/zhipuai");
const config_1 = require("./config");
function createChatModel() {
    if (!config_1.ZHIPU_API_KEY) {
        throw new Error("ZHIPU_API_KEY is not set");
    }
    return new zhipuai_1.ChatZhipuAI({
        apiKey: config_1.ZHIPU_API_KEY,
        model: "glm-4",
    });
}
