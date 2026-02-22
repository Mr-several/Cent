/**
 * OCR Provider Interface
 * Allows for extensibility to support different OCR services
 */
export interface OCRProvider {
    /** Provider name */
    name: string;
    /** Recognize text from an image file */
    recognize(image: File): Promise<string>;
}

/**
 * OCR Configuration
 * For future extensibility to support third-party OCR services
 */
export interface OCRConfig {
    provider: "tesseract" | "baidu" | "tencent";
    apiKey?: string;
    secretKey?: string;
    secretId?: string;
}
