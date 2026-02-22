import dayjs from "dayjs";
import {
    getAIConfigById,
    requestAI,
    requestAIWithImage,
} from "@/components/assistant/request";
import { numberToAmount } from "@/ledger/bill";
import type { BillCategory } from "@/ledger/type";
import {
    buildReceiptParseImagePrompt,
    buildReceiptParsePrompt,
} from "./prompt";
import type { CandidateBill } from "./types";

/**
 * Match category text to actual categoryId
 * @param categoryText AI returned category text, format: "Parent > Child" or "Parent"
 * @param categories All categories
 * @returns categoryId or undefined
 */
function matchCategoryId(
    categoryText: string | null,
    categories: BillCategory[],
): string | undefined {
    if (!categoryText) return undefined;

    // Parse category text
    const parts = categoryText.split(">").map((s) => s.trim());
    const parentName = parts[0];
    const childName = parts[1];

    // Find parent category
    const parent = categories.find((c) => !c.parent && c.name === parentName);
    if (!parent) return undefined;

    // If has child name, find child category
    if (childName) {
        const child = categories.find(
            (c) => c.parent === parent.id && c.name === childName,
        );
        return child?.id || parent.id; // Fallback to parent if child not found
    }

    return parent.id;
}

/**
 * Parse time string to timestamp
 * @param timeStr Time string in format "YYYY-MM-DD HH:mm:ss"
 * @returns Timestamp in milliseconds
 */
function parseTime(timeStr: string | null): number | undefined {
    if (!timeStr) return undefined;

    try {
        const parsed = dayjs(timeStr);
        if (parsed.isValid()) {
            return parsed.valueOf();
        }
    } catch (error) {
        console.error("Failed to parse time:", timeStr, error);
    }

    return undefined;
}

/**
 * Parse receipt OCR text using AI
 * @param ocrText OCR extracted text
 * @param imageIndex Source image index
 * @param categories All user categories
 * @param configId Optional AI config ID, falls back to default if not provided
 * @returns Array of candidate bills
 */
export async function parseReceiptText(
    ocrText: string,
    imageIndex: number,
    categories: BillCategory[],
    configId?: string,
): Promise<CandidateBill[]> {
    // Build prompt with user's categories
    const prompt = buildReceiptParsePrompt(ocrText, categories);

    // Request AI to parse, using specified config or default
    const config = getAIConfigById(configId);
    const response = await requestAI(
        [{ role: "user", content: prompt }],
        config,
    );

    return parseAIResponseToCandidates(
        response,
        imageIndex,
        categories,
        ocrText,
    );
}

/**
 * 将 AI 响应 JSON 文本转换为 CandidateBill 列表（通用逻辑）
 */
function parseAIResponseToCandidates(
    response: string,
    imageIndex: number,
    categories: BillCategory[],
    rawText?: string,
): CandidateBill[] {
    let jsonText = response.trim();
    if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(jsonText);
    const items = Array.isArray(parsed) ? parsed : [parsed];

    // biome-ignore lint/suspicious/noExplicitAny: AI 响应结构未知
    return items.map((item: any, index: number) => {
        const type = item.type === "income" ? "income" : "expense";
        let categoryId = matchCategoryId(item.category, categories);

        if (!categoryId) {
            const defaultCategory = categories.find(
                (c) => !c.parent && c.type === type,
            );
            categoryId = defaultCategory?.id;
        }

        return {
            tempId: `temp-${Date.now()}-${imageIndex}-${index}`,
            sourceImageIndex: imageIndex,
            type,
            amount: item.amount ? numberToAmount(item.amount) : undefined,
            merchant: item.merchant || undefined,
            merchantExplanation: item.merchantExplanation || undefined,
            time: parseTime(item.time),
            categoryId,
            status: "pending" as const,
            attachImage: false,
            rawText,
            aiResponse: response,
        };
    });
}

/**
 * 使用视觉模型直接识别图片中的交易记录（跳过 OCR 步骤）
 * @param imageFile 图片文件
 * @param imageIndex 图片索引
 * @param categories 所有用户分类
 * @param configId 可选的 AI 配置 ID，为空时使用默认配置
 * @returns Array of candidate bills
 */
export async function parseReceiptImage(
    imageFile: File,
    imageIndex: number,
    categories: BillCategory[],
    configId?: string,
): Promise<CandidateBill[]> {
    const prompt = buildReceiptParseImagePrompt(categories);
    const response = await requestAIWithImage(imageFile, prompt, configId);
    return parseAIResponseToCandidates(response, imageIndex, categories);
}
