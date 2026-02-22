import { useState } from "react";
import { toast } from "sonner";
import { getOCRProvider } from "@/api/ocr";
import useCategory from "@/hooks/use-category";
import { useIntl } from "@/locale";
import { usePreferenceStore } from "@/store/preference";
import { useReceiptStore } from "@/store/receipt";
import { parseReceiptImage, parseReceiptText } from "./ai-parser";
import type { CandidateBill } from "./types";

export type ProcessingStatus = {
    stage: "ocr" | "ai" | "vision";
    imageIndex: number;
    totalImages: number;
} | null;

/**
 * Process images with OCR and AI parsing
 * @param images Array of image files
 * @param categories Available categories for AI context
 * @param t i18n helper
 * @param onStatusChange Callback to report current processing stage
 * @returns Array of candidate bills
 */
export async function processReceiptImages(
    images: File[],
    categories: any[],
    t: any,
    onStatusChange?: (status: ProcessingStatus) => void,
): Promise<CandidateBill[]> {
    const preferenceState = usePreferenceStore.getState();
    const mode = preferenceState.receiptRecognitionMode ?? "ocr-ai";
    const configId = preferenceState.receiptAIConfigId;

    const allCandidates: CandidateBill[] = [];

    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageStartTime = Date.now();

        try {
            let candidates: CandidateBill[];

            if (mode === "vision-ai") {
                // 视觉模型模式：跳过 OCR，直接将图片发给视觉模型
                onStatusChange?.({ stage: "vision", imageIndex: i, totalImages: images.length });
                const aiStartTime = Date.now();
                candidates = await parseReceiptImage(image, i, categories, configId);
                const aiDuration = Date.now() - aiStartTime;
                console.log(
                    `[性能] 图片${i + 1} 视觉模型耗时: ${aiDuration}ms (${(aiDuration / 1000).toFixed(1)}秒)`,
                );
            } else {
                // OCR + 大模型模式（默认）
                const ocrProvider = getOCRProvider();

                // Step 1: OCR
                const ocrStartTime = Date.now();
                onStatusChange?.({ stage: "ocr", imageIndex: i, totalImages: images.length });
                const ocrText = await ocrProvider.recognize(image);
                const ocrDuration = Date.now() - ocrStartTime;
                console.log(
                    `[性能] 图片${i + 1} OCR耗时: ${ocrDuration}ms (${(ocrDuration / 1000).toFixed(1)}秒)`,
                );

                if (!ocrText || ocrText.trim().length === 0) {
                    toast.warning(t("receipt-ocr-no-text", { index: i + 1 }));
                    continue;
                }

                // Step 2: AI 解析
                const aiStartTime = Date.now();
                onStatusChange?.({ stage: "ai", imageIndex: i, totalImages: images.length });
                candidates = await parseReceiptText(ocrText, i, categories, configId);
                const aiDuration = Date.now() - aiStartTime;
                console.log(
                    `[性能] 图片${i + 1} AI解析耗时: ${aiDuration}ms (${(aiDuration / 1000).toFixed(1)}秒)`,
                );
            }

            const imageTotalDuration = Date.now() - imageStartTime;
            console.log(
                `[性能] 图片${i + 1} 总耗时: ${imageTotalDuration}ms (${(imageTotalDuration / 1000).toFixed(1)}秒)`,
            );

            if (candidates.length === 0) {
                toast.warning(t("receipt-ai-no-records", { index: i + 1 }));
                continue;
            }

            allCandidates.push(...candidates);
        } catch (error) {
            console.error(`[错误] 图片${i + 1}处理失败:`, error);
            toast.error(
                t("receipt-process-failed", {
                    index: i + 1,
                    error: error instanceof Error ? error.message : "未知错误",
                }),
            );
        }
    }

    return allCandidates;
}

/**
 * Receipt Recognition Hook
 * Manages the entire receipt recognition workflow
 */
export function useReceiptRecognition() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>(null);
    const { startSession, addCandidates, setProcessingDuration } =
        useReceiptStore();
    const { categories } = useCategory();
    const t = useIntl();

    const startRecognition = async (images: File[]) => {
        if (images.length === 0) {
            toast.error(t("receipt-no-images"));
            return;
        }

        setIsProcessing(true);
        const sessionStartTime = Date.now();

        try {
            // Start a new session
            startSession(images);

            // Process images
            const candidates = await processReceiptImages(
                images,
                categories,
                t,
                setProcessingStatus,
            );

            // Record total processing duration
            const totalDuration = Date.now() - sessionStartTime;
            setProcessingDuration(totalDuration);

            if (candidates.length === 0) {
                toast.error(t("receipt-no-candidates"));
                return;
            }

            // Add candidates to session
            addCandidates(candidates);

            toast.success(
                t("receipt-recognition-success", { count: candidates.length }),
            );
        } catch (error) {
            console.error("Receipt recognition failed:", error);
            toast.error(
                t("receipt-recognition-failed", {
                    error: error instanceof Error ? error.message : "未知错误",
                }),
            );
        } finally {
            setIsProcessing(false);
            setProcessingStatus(null);
        }
    };

    return {
        isProcessing,
        processingStatus,
        startRecognition,
    };
}
