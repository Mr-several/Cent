import dayjs from "dayjs";
import { useState } from "react";
import { toast } from "sonner";
import type { BillType } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useReceiptStore } from "@/store/receipt";
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
    } = useReceiptStore();
    const [globalTimeInput, setGlobalTimeInput] = useState(
        dayjs().format("YYYY-MM-DD HH:mm"),
    );
    const [globalTypeInput, setGlobalTypeInput] = useState<BillType>("expense");
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
        null,
    );
    const t = useIntl();

    if (!currentSession) return null;

    const pendingCount = currentSession.candidates.filter(
        (c: CandidateBill) => c.status === "pending",
    ).length;
    const confirmedCount = currentSession.candidates.filter(
        (c: CandidateBill) => c.status === "confirmed",
    ).length;
    const totalCount = currentSession.candidates.length;

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

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">
                        {t("receipt-recognition-title", { count: totalCount })}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={handleClose}>
                        <i className="icon-[mdi--close] text-xl" />
                    </Button>
                </div>

                {/* Original Images Preview */}
                <div className="p-4 border-b bg-muted/10">
                    <div className="text-sm font-medium mb-2">
                        {t("receipt-original-images")}
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {currentSession.images.map((image, index) => (
                            <div key={`image-${index}`} className="flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setSelectedImageIndex(index)}
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

                {/* Global Settings */}
                <div className="p-4 border-b bg-muted/30">
                    <div className="text-sm font-medium mb-2">
                        {t("receipt-global-settings")}
                    </div>
                    <div className="space-y-2">
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
                                <option value="expense">{t("expense")}</option>
                                <option value="income">{t("income")}</option>
                            </select>
                            <Button size="sm" onClick={handleApplyGlobalType}>
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
                            <Button size="sm" onClick={handleApplyGlobalTime}>
                                {t("receipt-apply-to-all")}
                            </Button>
                        </div>
                    </div>
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
                <div className="p-4 border-t bg-muted/30">
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
                </div>
            </div>

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
