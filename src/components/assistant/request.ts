import type { AIConfig } from "@/ledger/extra-type";
import { t } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import { decodeApiKey } from "@/utils/api-key";

/**
 * 从 store 获取 AI 配置
 * @param configId 可选的配置 ID，若指定则优先使用该配置，否则回退到默认配置
 * @returns AI配置对象
 * @throws 如果没有配置或没有默认配置时抛出错误
 */
export function getAIConfigById(configId?: string): AIConfig {
    const userId = useUserStore.getState().id;
    const assistantData =
        useLedgerStore.getState().infos?.meta.personal?.[userId]?.assistant;

    // 优先使用新的配置系统
    if (assistantData?.configs && assistantData.configs.length > 0) {
        // 如果指定了 configId，优先查找该配置
        if (configId) {
            const specificConfig = assistantData.configs.find(
                (c) => c.id === configId,
            );
            if (specificConfig) {
                return specificConfig;
            }
        }
        const defaultConfigId = assistantData.defaultConfigId;
        if (defaultConfigId) {
            const config = assistantData.configs.find(
                (c) => c.id === defaultConfigId,
            );
            if (config) {
                return config;
            }
        }
    }

    // Fallback: 如果新配置不存在，尝试使用旧的 bigmodel 配置
    const oldApiKey = assistantData?.bigmodel?.apiKey;
    if (oldApiKey) {
        // 构造一个临时的配置对象，使用智谱 AI 的默认配置
        return {
            id: "legacy-bigmodel",
            name: "智谱GLM (Legacy)",
            apiKey: oldApiKey,
            apiUrl: "https://open.bigmodel.cn/api/paas/v4",
            model: "glm-4-flash",
            apiType: "open-ai-compatible",
        };
    }

    // 如果新旧配置都不存在，抛出错误
    throw new Error(t("ai-config-required-error"));
}

/**
 * 构建 AI API 请求的 URL
 * @param config AI 配置
 * @returns 完整的 API URL
 */
function buildAIRequestUrl(config: AIConfig): string {
    if (config.apiType === "google-ai-studio") {
        // Google AI Studio API URL 格式
        if (config.apiUrl.includes(":generateContent")) {
            return config.apiUrl;
        }
        const baseUrl = config.apiUrl.endsWith("/")
            ? config.apiUrl.slice(0, -1)
            : config.apiUrl;
        return `${baseUrl}/v1beta/models/${config.model}:generateContent`;
    } else {
        // OpenAI 兼容格式
        return config.apiUrl.endsWith("/")
            ? `${config.apiUrl}chat/completions`
            : `${config.apiUrl}/chat/completions`;
    }
}

/**
 * 构建 AI API 请求的请求头
 * @param apiType API 类型
 * @param apiKey API Key
 * @returns 请求头对象
 */
function buildAIRequestHeaders(
    apiType: AIConfig["apiType"],
    apiKey: string,
): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (apiType === "google-ai-studio") {
        headers["x-goog-api-key"] = apiKey;
    } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }

    return headers;
}

/**
 * 构建 AI API 请求体
 * @param config AI 配置
 * @param messages 消息列表
 * @param options 可选参数（temperature, max_tokens/maxOutputTokens）
 * @returns 请求体对象
 */
function buildAIRequestBody(
    config: AIConfig,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
        temperature?: number;
        max_tokens?: number;
        maxOutputTokens?: number;
    },
): unknown {
    if (config.apiType === "google-ai-studio") {
        // Google AI Studio 格式
        const contents: Array<{
            role: "user" | "model";
            parts: Array<{ text: string }>;
        }> = [];

        let systemInstruction: string | undefined;

        for (const msg of messages) {
            if (msg.role === "system") {
                // 收集 system 消息作为 systemInstruction
                if (systemInstruction) {
                    systemInstruction += "\n\n" + msg.content;
                } else {
                    systemInstruction = msg.content;
                }
            } else {
                // user 和 assistant 消息转换为 contents
                const role = msg.role === "user" ? "user" : "model";
                contents.push({
                    role,
                    parts: [{ text: msg.content }],
                });
            }
        }

        const requestBody: {
            contents: typeof contents;
            systemInstruction?: { parts: Array<{ text: string }> };
            generationConfig?: {
                temperature?: number;
                maxOutputTokens?: number;
                thinkingConfig?: { thinkingBudget: number };
            };
        } = {
            contents,
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens:
                    options?.maxOutputTokens ?? options?.max_tokens ?? 2000,
                // 启用思考模式：thinkingBudget=-1 表示动态预算
                ...(config.thinkingEnabled && {
                    thinkingConfig: { thinkingBudget: -1 },
                }),
            },
        };

        // 如果有 system instruction，添加到请求中
        if (systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: systemInstruction }],
            };
        }

        return requestBody;
    } else {
        // OpenAI 兼容格式
        return {
            model: config.model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.max_tokens ?? 2000,
            // 启用思考模式（Anthropic Claude 等支持此格式）
            ...(config.thinkingEnabled && {
                thinking: { type: "enabled", budget_tokens: 8000 },
            }),
        };
    }
}

/**
 * 通用的 AI API 请求函数
 * @param config AI 配置
 * @param apiKey 解码后的 API Key
 * @param messages 消息列表
 * @param options 可选参数（temperature, max_tokens/maxOutputTokens）
 * @returns fetch Response 对象
 */
export async function makeAIAPIRequest(
    config: AIConfig,
    apiKey: string,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
        temperature?: number;
        max_tokens?: number;
        maxOutputTokens?: number;
    },
): Promise<Response> {
    const url = buildAIRequestUrl(config);
    const headers = buildAIRequestHeaders(config.apiType, apiKey);
    const body = buildAIRequestBody(config, messages, options);

    return fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
}

/**
 * AI API 请求，支持 OpenAI 兼容和 Google AI Studio 的 API 格式
 * @param messages 结构化的消息列表，包含 system、user、assistant 角色的消息
 */
export const requestAI = async (
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    _config?: AIConfig,
): Promise<string> => {
    // 从 store 获取 AI 配置
    const config = _config ?? getAIConfigById();

    // 解码 base64 编码的 API Key
    const apiKey = decodeApiKey(config.apiKey);

    // 根据 API 类型选择不同的请求方式
    if (config.apiType === "google-ai-studio") {
        return requestGoogleAIStudio(config, apiKey, messages);
    } else {
        return requestOpenAICompatible(config, apiKey, messages);
    }
};

/**
 * OpenAI 兼容格式的 API 请求
 */
async function requestOpenAICompatible(
    config: AIConfig,
    apiKey: string,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
    try {
        const response = await makeAIAPIRequest(config, apiKey, messages, {
            temperature: 0.7,
            max_tokens: 2000,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `AI API 请求失败: ${response.status} ${response.statusText}. ${errorText}`,
            );
        }

        const data = await response.json();

        // 提取 AI 响应文本
        if (data.choices && data.choices.length > 0) {
            const content = data.choices[0].message?.content;
            // 普通字符串响应
            if (typeof content === "string") {
                return content;
            }
            // 思考模式下响应可能为内容块数组（如 Anthropic Claude），提取 text 块
            if (Array.isArray(content)) {
                const textBlocks = content
                    .filter(
                        (block: { type: string; text?: string }) =>
                            block.type === "text" && typeof block.text === "string",
                    )
                    .map((block: { type: string; text?: string }) => block.text)
                    .join("");
                if (textBlocks) {
                    return textBlocks;
                }
            }
        }

        throw new Error("AI API 响应格式异常");
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`AI API 请求异常: ${String(error)}`);
    }
}

/**
 * Google AI Studio 格式的 API 请求
 */
async function requestGoogleAIStudio(
    config: AIConfig,
    apiKey: string,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
    try {
        const response = await makeAIAPIRequest(config, apiKey, messages, {
            temperature: 0.7,
            maxOutputTokens: 2000,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `AI API 请求失败: ${response.status} ${response.statusText}. ${errorText}`,
            );
        }

        const data = await response.json();

        // 提取 AI 响应文本
        // Google AI Studio 响应格式: candidates[0].content.parts[].text
        // 思考模式下 parts 中包含 thought=true 的思考块，需过滤后拼接
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (
                candidate.content?.parts &&
                candidate.content.parts.length > 0
            ) {
                const textParts = (
                    candidate.content.parts as Array<{
                        text?: string;
                        thought?: boolean;
                    }>
                )
                    .filter((part) => !part.thought && typeof part.text === "string")
                    .map((part) => part.text)
                    .join("");
                if (textParts) {
                    return textParts;
                }
            }
        }

        throw new Error("AI API 响应格式异常");
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`AI API 请求异常: ${String(error)}`);
    }
}

/**
 * 将 File 转换为 base64 字符串
 */
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // 去掉 data URL 前缀，只保留 base64 部分
            const base64 = result.split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 构建视觉模型请求体（包含图片）
 */
function buildVisionRequestBody(
    config: AIConfig,
    prompt: string,
    imageBase64: string,
    mimeType: string,
): unknown {
    if (config.apiType === "google-ai-studio") {
        return {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: imageBase64 } },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2000,
            },
        };
    } else {
        // OpenAI 兼容格式：content 为数组，包含文本和图片
        return {
            model: config.model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            temperature: 0.3,
            max_tokens: 2000,
        };
    }
}

/**
 * 向视觉模型发送图片和提示词，直接分析图片内容（跳过 OCR 步骤）
 * @param imageFile 图片文件
 * @param prompt 提示词文本
 * @param configId 可选的 AI 配置 ID，为空时使用默认配置
 * @returns 模型返回的文本
 */
export async function requestAIWithImage(
    imageFile: File,
    prompt: string,
    configId?: string,
): Promise<string> {
    const config = getAIConfigById(configId);
    const apiKey = decodeApiKey(config.apiKey);
    const imageBase64 = await fileToBase64(imageFile);
    const mimeType = imageFile.type || "image/jpeg";

    const url = buildAIRequestUrl(config);
    const headers = buildAIRequestHeaders(config.apiType, apiKey);
    const body = buildVisionRequestBody(config, prompt, imageBase64, mimeType);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `AI API 请求失败: ${response.status} ${response.statusText}. ${errorText}`,
            );
        }

        const data = await response.json();

        if (config.apiType === "google-ai-studio") {
            if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (candidate.content?.parts && candidate.content.parts.length > 0) {
                    const textParts = (
                        candidate.content.parts as Array<{
                            text?: string;
                            thought?: boolean;
                        }>
                    )
                        .filter(
                            (part) =>
                                !part.thought && typeof part.text === "string",
                        )
                        .map((part) => part.text)
                        .join("");
                    if (textParts) {
                        return textParts;
                    }
                }
            }
        } else {
            if (data.choices && data.choices.length > 0) {
                const content = data.choices[0].message?.content;
                if (typeof content === "string") {
                    return content;
                }
                if (Array.isArray(content)) {
                    const textBlocks = content
                        .filter(
                            (block: { type: string; text?: string }) =>
                                block.type === "text" &&
                                typeof block.text === "string",
                        )
                        .map((block: { type: string; text?: string }) => block.text)
                        .join("");
                    if (textBlocks) {
                        return textBlocks;
                    }
                }
            }
        }

        throw new Error("AI API 响应格式异常");
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`AI API 请求异常: ${String(error)}`);
    }
}
