import dayjs from "dayjs";
import { useState } from "react";
import { toast } from "sonner";
import type { BillType } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { useReceiptStore } from "@/store/receipt";
import { TagListProvider } from "../bill-tag";
import { Button } from "../ui/button";
import { CandidateRecordItem } from "./candidate-item";
import type { CandidateBill } from "./types";

/**
 * Batch Confirmation Component
 * Displays all candidate bills and allows user to review and confirm them
 */
export function BatchConfirmation() {
    const {
        currentSession,
        clearSession,
        setGlobalTime,
        setGlobalType,
        applyGlobalTimeToAll,
        applyGlobalTypeToAll,
        confirmAllPending,
        deleteAllPending,
    } = useReceiptStore();
    const [globalTimeInput, setGlobalTimeInput] = useState(
        dayjs().format("YYYY-MM-DD HH:mm"),
    );
    const [globalTypeInput, setGlobalTypeInput] = useState<BillType>("expense");
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
        null,
    );
    const [isImagesExpanded, setIsImagesExpanded] = useState(false);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
    const [isConfirmingAll, setIsConfirmingAll] = useState(false);
    const t = useIntl();

    if (!currentSession) return null;

    const pendingCount = currentSession.candidates.filter(
        (c: CandidateBill) => c.status === "pending",
    ).length;
    const confirmedCount = currentSession.candidates.filter(
        (c: CandidateBill) => c.status === "confirmed",
    ).length;
    const totalCount = currentSession.candidates.length;

    const durationSeconds = currentSession.processingDuration
        ? (currentSession.processingDuration / 1000).toFixed(1)
        : null;

    const handleClose = () => {
        if (pendingCount > 0) {
            const confirmed = window.confirm(
                t("receipt-close-confirm", { count: pendingCount }),
            );
            if (!confirmed) return;
        }
        clearSession();
    };

    const handleApplyGlobalTime = () => {
        const timestamp = dayjs(globalTimeInput).valueOf();
        if (!timestamp || Number.isNaN(timestamp)) {
            toast.error(t("receipt-invalid-time"));
            return;
        }
        setGlobalTime(timestamp);
        applyGlobalTimeToAll();
        toast.success(t("receipt-time-applied"));
    };

    const handleApplyGlobalType = () => {
        setGlobalType(globalTypeInput);
        applyGlobalTypeToAll();
        toast.success(t("receipt-type-applied"));
    };

    const handleConfirmAll = async () => {
        // 批量确认前检测所有 pending 记录中的重复项
        const pendingCandidates = (currentSession?.candidates ?? []).filter(
            (c: CandidateBill) => c.status === "pending",
        );
        const existingBills = useLedgerStore.getState().bills;
        const duplicateCount = pendingCandidates.filter((candidate) => {
            if (!candidate.amount) return false;
            const billTime = candidate.time ?? Date.now();
            const candidateDay = dayjs(billTime).startOf("day");
            return existingBills.some((bill) => {
                const sameDay = dayjs(bill.time)
                    .startOf("day")
                    .isSame(candidateDay);
                const sameAmount = bill.amount === candidate.amount;
                return sameDay && sameAmount;
            });
        }).length;

        if (duplicateCount > 0) {
            const proceed = window.confirm(
                t("receipt-confirm-all-duplicate-warning", {
                    count: duplicateCount,
                }),
            );
            if (!proceed) return;
        }

        setIsConfirmingAll(true);
        try {
            const { succeeded, skipped } = await confirmAllPending();
            toast.success(
                t("receipt-confirm-all-success", { succeeded, skipped }),
            );
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "确认失败");
        } finally {
            setIsConfirmingAll(false);
        }
    };

    const handleDeleteAll = () => {
        const confirmed = window.confirm(
            t("receipt-delete-all-confirm", { count: pendingCount }),
        );
        if (!confirmed) return;
        deleteAllPending();
        toast.success(t("receipt-delete-all-success", { count: pendingCount }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">
                            {t("receipt-recognition-title", {
                                count: totalCount,
                            })}
                        </h2>
                        {durationSeconds && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("receipt-recognition-duration", {
                                    seconds: durationSeconds,
                                })}
                            </p>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClose}>
                        <i className="icon-[mdi--close] text-xl" />
                    </Button>
                </div>

                {/* Original Images Preview — Collapsible */}
                <div className="border-b">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-2 bg-muted/10 hover:bg-muted/20 transition-colors text-left"
                        onClick={() => setIsImagesExpanded((prev) => !prev)}
                    >
                        <span className="text-sm font-medium">
                            {t("receipt-original-images")}
                        </span>
                        <i
                            className={`icon-[mdi--chevron-down] size-4 text-muted-foreground transition-transform duration-200 ${isImagesExpanded ? "rotate-180" : ""}`}
                        />
                    </button>
                    {isImagesExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-muted/10">
                            <div className="flex gap-2 overflow-x-auto">
                                {currentSession.images.map((image, index) => (
                                    <div
                                        key={`image-${index}`}
                                        className="flex-shrink-0"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedImageIndex(index)
                                            }
                                            className="border-0 p-0 bg-transparent cursor-pointer"
                                        >
                                            <img
                                                src={URL.createObjectURL(image)}
                                                alt={`Receipt ${index + 1}`}
                                                className="h-32 w-auto rounded border hover:opacity-80 transition-opacity"
                                            />
                                        </button>
                                        <div className="text-xs text-center mt-1 text-muted-foreground">
                                            {t("receipt-source-image", {
                                                index: index + 1,
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Global Settings — Collapsible */}
                <div className="border-b">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/40 transition-colors text-left"
                        onClick={() => setIsSettingsExpanded((prev) => !prev)}
                    >
                        <span className="text-sm font-medium">
                            {t("receipt-global-settings")}
                        </span>
                        <i
                            className={`icon-[mdi--chevron-down] size-4 text-muted-foreground transition-transform duration-200 ${isSettingsExpanded ? "rotate-180" : ""}`}
                        />
                    </button>
                    {isSettingsExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-muted/30 space-y-2">
                            {/* Global Type */}
                            <div className="flex items-center gap-2">
                                <label
                                    htmlFor="global-type-select"
                                    className="text-sm min-w-[60px]"
                                >
                                    {t("type")}:
                                </label>
                                <select
                                    id="global-type-select"
                                    value={globalTypeInput}
                                    onChange={(e) =>
                                        setGlobalTypeInput(
                                            e.target.value as BillType,
                                        )
                                    }
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                >
                                    <option value="expense">
                                        {t("expense")}
                                    </option>
                                    <option value="income">
                                        {t("income")}
                                    </option>
                                </select>
                                <Button
                                    size="sm"
                                    onClick={handleApplyGlobalType}
                                >
                                    {t("receipt-apply-to-all")}
                                </Button>
                            </div>

                            {/* Global Time */}
                            <div className="flex items-center gap-2">
                                <label
                                    htmlFor="global-time-input"
                                    className="text-sm min-w-[60px]"
                                >
                                    {t("time")}:
                                </label>
                                <input
                                    id="global-time-input"
                                    type="datetime-local"
                                    value={globalTimeInput}
                                    onChange={(e) =>
                                        setGlobalTimeInput(e.target.value)
                                    }
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                />
                                <Button
                                    size="sm"
                                    onClick={handleApplyGlobalTime}
                                >
                                    {t("receipt-apply-to-all")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Candidate List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {currentSession.candidates.map(
                        (candidate: CandidateBill, index: number) => (
                            <CandidateRecordItem
                                key={candidate.tempId}
                                candidate={candidate}
                                index={index}
                                total={totalCount}
                            />
                        ),
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30 space-y-3">
                    {/* Stats row */}
                    <div className="flex items-center justify-between text-sm">
                        <span>
                            {t("receipt-confirmed")}: {confirmedCount}
                        </span>
                        <span>
                            {t("receipt-pending")}: {pendingCount}
                        </span>
                        <span>
                            {t("receipt-total")}: {totalCount}
                        </span>
                    </div>

                    {/* Batch action buttons — only shown when there are pending records */}
                    {pendingCount > 0 && (
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={handleDeleteAll}
                            >
                                <i className="icon-[mdi--delete-sweep-outline] size-4 mr-1" />
                                {t("receipt-delete-all-pending")}
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                className="flex-1"
                                onClick={handleConfirmAll}
                                disabled={isConfirmingAll}
                            >
                                {isConfirmingAll ? (
                                    <i className="icon-[mdi--loading] animate-spin size-4 mr-1" />
                                ) : (
                                    <i className="icon-[mdi--check-all] size-4 mr-1" />
                                )}
                                {t("receipt-confirm-all-pending")}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tag Editor Provider */}
            <TagListProvider />

            {/* Image Fullscreen Modal */}
            {selectedImageIndex !== null && (
                <button
                    type="button"
                    className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 border-0"
                    onClick={() => setSelectedImageIndex(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <img
                            src={URL.createObjectURL(
                                currentSession.images[selectedImageIndex],
                            )}
                            alt={`Receipt ${selectedImageIndex + 1}`}
                            className="max-w-full max-h-[90vh] object-contain"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                            onClick={() => setSelectedImageIndex(null)}
                        >
                            <i className="icon-[mdi--close] text-xl" />
                        </Button>
                    </div>
                </button>
            )}
        </div>
    );
}
