import type { Amount, BillType, MerchantCategoryRecord } from "@/ledger/type";

/**
 * Candidate Bill - A bill record extracted from receipt image
 * Pending user confirmation before saving to database
 */
export type CandidateBill = {
    /** Temporary ID (will be replaced with UUID after confirmation) */
    tempId: string;
    /** Source image index */
    sourceImageIndex: number;

    /** Recognized fields (may be undefined) */
    type?: BillType;
    amount?: Amount;
    merchant?: string;
    merchantExplanation?: string; // AI-generated explanation (UI only, not persisted)
    time?: number;
    categoryId?: string;
    tagIds?: string[];
    comment?: string;

    /** Status */
    status: "pending" | "confirmed" | "deleted";
    /** AI confidence score (0-1) */
    confidence?: number;

    /** Attach original image to this bill */
    attachImage?: boolean;

    /**
     * Merchant memory suggestions sorted by count desc.
     * Populated after AI parsing when the merchant has historical category records.
     */
    memorySuggestions?: MerchantCategoryRecord[];
    /**
     * The original categoryId inferred by AI before merchant memory is applied.
     * Used to render the AI suggestion chip at the end of suggestion list.
     */
    aiCategoryId?: string;

    /** Raw data for debugging */
    rawText?: string;
    aiResponse?: string;
};

/**
 * Recognition Session - Manages the entire receipt recognition workflow
 */
export type RecognitionSession = {
    /** Session ID */
    id: string;
    /** Uploaded images */
    images: File[];
    /** Candidate bills extracted from images */
    candidates: CandidateBill[];
    /** Global time setting (can be applied to all pending bills) */
    globalTime?: number;
    /** Global type setting (can be applied to all pending bills) */
    globalType?: BillType;
    /** Session creation time */
    createdAt: number;
    /** Total processing duration in milliseconds */
    processingDuration?: number;
};
