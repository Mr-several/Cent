import Tesseract from "tesseract.js";
import type { OCRProvider } from "./types";

/**
 * Tesseract.js OCR Provider
 * Provides local OCR processing in the browser
 */
export class TesseractOCR implements OCRProvider {
    name = "Tesseract.js";

    /**
     * Recognize text from an image file
     * @param image Image file to process
     * @returns Extracted text
     */
    async recognize(image: File): Promise<string> {
        try {
            const result = await Tesseract.recognize(image, "chi_sim+eng", {
                // 部署到静态站点后，使用同源 worker 避免 CSP 阻止 CDN 脚本
                workerPath: "/worker.min.js",
                workerBlobURL: false,
                logger: (m) => {
                    // Log progress for debugging
                    if (m.status === "recognizing text") {
                        console.log(
                            `OCR Progress: ${Math.round(m.progress * 100)}%`,
                        );
                    }
                },
            });

            return result.data.text;
        } catch (error) {
            console.error("Tesseract OCR failed:", error);
            throw new Error(
                `OCR识别失败: ${error instanceof Error ? error.message : "未知错误"}`,
            );
        }
    }
}
