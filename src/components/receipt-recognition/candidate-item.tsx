import dayjs from "dayjs";
import { useState } from "react";
import { toast } from "sonner";
import useCategory from "@/hooks/use-category";
import { useTag } from "@/hooks/use-tag";
import { amountToNumber, numberToAmount } from "@/ledger/bill";
import type { BillType } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useReceiptStore } from "@/store/receipt";
import { Button } from "../ui/button";
import type { CandidateBill } from "./types";

interface CandidateRecordItemProps {
    candidate: CandidateBill;
    index: number;
    total: number;
}

/**
 * Candidate Record Item Component
 * Allows user to edit and confirm a single candidate bill
 */
export function CandidateRecordItem({
    candidate,
    index,
    total,
}: CandidateRecordItemProps) {
    const { updateCandidate, deleteCandidate, confirmCandidate } =
        useReceiptStore();
    const { categories } = useCategory();
    const { tags: allTags } = useTag();
    const t = useIntl();

    const [isConfirming, setIsConfirming] = useState(false);

    // Get category options based on type
    const categoryOptions = categories.filter(
        (c) => c.type === (candidate.type || "expense"),
    );

    const handleFieldChange = (field: keyof CandidateBill, value: any) => {
        updateCandidate(candidate.tempId, { [field]: value });
    };

    const handleAmountChange = (value: string) => {
        const num = Number.parseFloat(value);
        if (!Number.isNaN(num)) {
            handleFieldChange("amount", numberToAmount(num));
        }
    };

    const handleTimeChange = (value: string) => {
        const timestamp = dayjs(value).valueOf();
        if (!Number.isNaN(timestamp)) {
            handleFieldChange("time", timestamp);
        }
    };

    const handleConfirm = async () => {
        if (!candidate.amount) {
            toast.error(t("receipt-amount-required"));
            return;
        }
        if (!candidate.categoryId) {
            toast.error(t("receipt-category-required"));
            return;
        }

        setIsConfirming(true);
        try {
            await confirmCandidate(candidate.tempId);
            toast.success(t("receipt-confirmed-success"));
        } catch (error) {
            console.error("Failed to confirm candidate:", error);
            toast.error(
                t("receipt-confirm-failed", {
                    error: error instanceof Error ? error.message : "未知错误",
                }),
            );
        } finally {
            setIsConfirming(false);
        }
    };

    const handleDelete = () => {
        const confirmed = window.confirm(t("receipt-delete-confirm"));
        if (confirmed) {
            deleteCandidate(candidate.tempId);
            toast.success(t("receipt-deleted"));
        }
    };

    // Don't render if deleted
    if (candidate.status === "deleted") return null;

    const isConfirmed = candidate.status === "confirmed";

    return (
        <div
            className={`border rounded-lg p-4 ${
                isConfirmed
                    ? "bg-green-50 dark:bg-green-900/20 opacity-60"
                    : "bg-background"
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">
                    {t("receipt-record-index", { index: index + 1, total })}
                </div>
                <div className="flex gap-2">
                    {!isConfirmed && (
                        <>
                            <Button
                                size="sm"
                                onClick={handleConfirm}
                                disabled={isConfirming}
                            >
                                {isConfirming ? (
                                    <i className="icon-[mdi--loading] animate-spin" />
                                ) : (
                                    t("confirm")
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleDelete}
                            >
                                {t("delete")}
                            </Button>
                        </>
                    )}
                    {isConfirmed && (
                        <span className="text-sm text-green-600 dark:text-green-400">
                            ✓ {t("confirmed")}
                        </span>
                    )}
                </div>
            </div>

            {/* Source Image Info */}
            <div className="text-xs text-muted-foreground mb-3">
                {t("receipt-source-image", {
                    index: candidate.sourceImageIndex + 1,
                })}
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
                {/* Type */}
                <div className="flex items-center gap-2">
                    <label className="text-sm min-w-[80px]">{t("type")}:</label>
                    <select
                        value={candidate.type || "expense"}
                        onChange={(e) =>
                            handleFieldChange(
                                "type",
                                e.target.value as BillType,
                            )
                        }
                        disabled={isConfirmed}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                    >
                        <option value="expense">{t("expense")}</option>
                        <option value="income">{t("income")}</option>
                    </select>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-2">
                    <label className="text-sm min-w-[80px]">
                        {t("amount")}:
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={
                            candidate.amount
                                ? amountToNumber(candidate.amount)
                                : ""
                        }
                        onChange={(e) => handleAmountChange(e.target.value)}
                        disabled={isConfirmed}
                        placeholder={t("receipt-amount-placeholder")}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                </div>

                {/* Merchant */}
                {candidate.merchant && (
                    <div className="flex items-center gap-2">
                        <label className="text-sm min-w-[80px]">
                            {t("merchant")}:
                        </label>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={candidate.merchant || ""}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "merchant",
                                        e.target.value,
                                    )
                                }
                                disabled={isConfirmed}
                                className="w-full px-2 py-1 border rounded text-sm"
                            />
                            {/* Merchant Explanation */}
                            {candidate.merchantExplanation && (
                                <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                                    <i className="icon-[mdi--lightbulb-outline] text-sm flex-shrink-0 mt-0.5" />
                                    <span>{candidate.merchantExplanation}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Category */}
                <div className="flex items-center gap-2">
                    <label className="text-sm min-w-[80px]">
                        {t("category")}:
                    </label>
                    <select
                        value={candidate.categoryId || ""}
                        onChange={(e) =>
                            handleFieldChange("categoryId", e.target.value)
                        }
                        disabled={isConfirmed}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                    >
                        <option value="">{t("receipt-select-category")}</option>
                        {categoryOptions.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2">
                    <label className="text-sm min-w-[80px]">{t("time")}:</label>
                    <input
                        type="datetime-local"
                        value={
                            candidate.time
                                ? dayjs(candidate.time).format(
                                      "YYYY-MM-DDTHH:mm",
                                  )
                                : dayjs().format("YYYY-MM-DDTHH:mm")
                        }
                        onChange={(e) => handleTimeChange(e.target.value)}
                        disabled={isConfirmed}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                </div>

                {/* Comment */}
                <div className="flex items-center gap-2">
                    <label className="text-sm min-w-[80px]">
                        {t("comment")}:
                    </label>
                    <input
                        type="text"
                        value={candidate.comment || ""}
                        onChange={(e) =>
                            handleFieldChange("comment", e.target.value)
                        }
                        disabled={isConfirmed}
                        placeholder={t("receipt-comment-placeholder")}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                </div>

                {/* Attach Image */}
                {!isConfirmed && (
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor={`attach-image-${candidate.tempId}`}
                            className="text-sm min-w-[80px]"
                        >
                            {t("receipt-attach-image")}:
                        </label>
                        <input
                            id={`attach-image-${candidate.tempId}`}
                            type="checkbox"
                            checked={candidate.attachImage || false}
                            onChange={(e) =>
                                handleFieldChange(
                                    "attachImage",
                                    e.target.checked,
                                )
                            }
                            className="w-4 h-4"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
