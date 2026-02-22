import type { Amount, BillType } from "@/ledger/type";

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
};
