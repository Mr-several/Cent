import { TesseractOCR } from "./tesseract";
import type { OCRProvider } from "./types";

/**
 * Get OCR Provider based on configuration
 * Currently only supports Tesseract.js
 * Future: Support Baidu OCR, Tencent OCR, etc.
 */
export function getOCRProvider(): OCRProvider {
    // For now, always return Tesseract
    // In the future, read from user settings
    return new TesseractOCR();
}

export type { OCRConfig, OCRProvider } from "./types";
