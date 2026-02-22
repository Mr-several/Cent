import dayjs from "dayjs";
import { useState } from "react";
import { toast } from "sonner";
import CategoryIcon from "@/components/category/icon";
import useCategory from "@/hooks/use-category";
import { useTag } from "@/hooks/use-tag";
import { amountToNumber, numberToAmount } from "@/ledger/bill";
import type { BillCategory, BillType } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { useReceiptStore } from "@/store/receipt";
import { cn } from "@/utils";
import { Button } from "../ui/button";
import type { CandidateBill } from "./types";

interface CandidateRecordItemProps {
    candidate: CandidateBill;
    index: number;
    total: number;
}

type TreeCategory = BillCategory & { children: BillCategory[] };

/** 内联分类选择器，支持父类+子类两级展示和折叠 */
function CategoryPicker({
    value,
    onChange,
    type,
    disabled,
}: {
    value?: string;
    onChange: (id: string) => void;
    type: BillType;
    disabled?: boolean;
}) {
    const { expenses, incomes } = useCategory();
    const t = useIntl();
    const [isOpen, setIsOpen] = useState(false);

    const rootCategories: TreeCategory[] =
        type === "expense" ? expenses : incomes;

    // 找到当前选中的父类和子类
    const findSelected = () => {
        if (!value) return { parent: null, sub: null };
        for (const parent of rootCategories) {
            if (parent.id === value) return { parent, sub: null };
            const sub = parent.children.find((c) => c.id === value);
            if (sub) return { parent, sub };
        }
        return { parent: null, sub: null };
    };

    const { parent: selectedParent, sub: selectedSub } = findSelected();
    const displayCategory = selectedSub ?? selectedParent;

    const handleParentClick = (cat: TreeCategory) => {
        if (cat.children.length === 0) {
            onChange(cat.id);
            setIsOpen(false);
        } else {
            // 选中父类，展示子类（如果已选中同一父类则折叠）
            onChange(cat.id);
        }
    };

    const handleSubClick = (sub: BillCategory) => {
        onChange(sub.id);
        setIsOpen(false);
    };

    const subCategories = selectedParent?.children ?? [];

    return (
        <div className="flex-1 space-y-2">
            {/* 已选分类展示 / 点击打开 */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((v) => !v)}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors",
                    disabled
                        ? "opacity-60 cursor-not-allowed bg-muted"
                        : "hover:bg-muted/50 cursor-pointer",
                    isOpen && "border-primary",
                )}
            >
                <div className="flex items-center gap-2">
                    {displayCategory ? (
                        <>
                            <CategoryIcon
                                icon={displayCategory.icon}
                                className="w-4 h-4 flex-shrink-0"
                            />
                            <span>{displayCategory.name}</span>
                            {selectedSub && selectedParent && (
                                <span className="text-xs text-muted-foreground">
                                    （{selectedParent.name}）
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-muted-foreground">
                            {t("receipt-select-category")}
                        </span>
                    )}
                </div>
                <i
                    className={cn(
                        "icon-[mdi--chevron-down] text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                    )}
                />
            </button>

            {/* 展开的选择区域 */}
            {isOpen && !disabled && (
                <div className="border rounded-lg p-2 space-y-2 bg-background shadow-sm">
                    {/* 父类列表 */}
                    <div className="grid grid-cols-3 gap-1">
                        {rootCategories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleParentClick(cat)}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition-colors",
                                    selectedParent?.id === cat.id
                                        ? "bg-slate-700 text-white border-slate-700"
                                        : "bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600",
                                )}
                            >
                                <CategoryIcon
                                    icon={cat.icon}
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                />
                                <span className="truncate">{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* 子类列表（仅当选中了有子类的父类时展示） */}
                    {subCategories.length > 0 && (
                        <div className="border rounded-md p-1.5 grid grid-cols-3 gap-1 bg-muted/30">
                            {subCategories.map((sub) => (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => handleSubClick(sub)}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition-colors",
                                        selectedSub?.id === sub.id
                                            ? "bg-slate-700 text-white border-slate-700"
                                            : "bg-background hover:bg-stone-100 dark:hover:bg-stone-700",
                                    )}
                                >
                                    <CategoryIcon
                                        icon={sub.icon}
                                        className="w-3.5 h-3.5 flex-shrink-0"
                                    />
                                    <span className="truncate">{sub.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
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
    const { tags: allTags } = useTag();
    const t = useIntl();

    const [isConfirming, setIsConfirming] = useState(false);

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

    const checkDuplicate = (): boolean => {
        if (!candidate.amount) return false;
        const billTime = candidate.time ?? Date.now();
        const candidateDay = dayjs(billTime).startOf("day");

        const existingBills = useLedgerStore.getState().bills;
        const duplicates = existingBills.filter((bill) => {
            const sameDay = dayjs(bill.time)
                .startOf("day")
                .isSame(candidateDay);
            const sameAmount = bill.amount === candidate.amount;
            return sameDay && sameAmount;
        });

        if (duplicates.length === 0) return false;

        const dateStr = candidateDay.format("YYYY-MM-DD");
        const amountStr = amountToNumber(candidate.amount).toFixed(2);

        const message = candidate.merchant
            ? t("receipt-duplicate-warning", {
                  date: dateStr,
                  amount: amountStr,
                  merchant: candidate.merchant,
              })
            : t("receipt-possible-duplicate", {
                  date: dateStr,
                  amount: amountStr,
              });

        return !window.confirm(message);
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

        // 重复账单校验
        const shouldAbort = checkDuplicate();
        if (shouldAbort) return;

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
    const billType = (candidate.type || "expense") as BillType;

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
                    <label
                        htmlFor={`type-${candidate.tempId}`}
                        className="text-sm min-w-[80px]"
                    >
                        {t("type")}:
                    </label>
                    <select
                        id={`type-${candidate.tempId}`}
                        value={billType}
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
                    <label
                        htmlFor={`amount-${candidate.tempId}`}
                        className="text-sm min-w-[80px]"
                    >
                        {t("amount")}:
                    </label>
                    <input
                        id={`amount-${candidate.tempId}`}
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
                        <label
                            htmlFor={`merchant-${candidate.tempId}`}
                            className="text-sm min-w-[80px]"
                        >
                            {t("merchant")}:
                        </label>
                        <div className="flex-1">
                            <input
                                id={`merchant-${candidate.tempId}`}
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
                <div className="flex items-start gap-2">
                    <span className="text-sm min-w-[80px] mt-2">
                        {t("category")}:
                    </span>
                    <CategoryPicker
                        value={candidate.categoryId}
                        onChange={(id) => handleFieldChange("categoryId", id)}
                        type={billType}
                        disabled={isConfirmed}
                    />
                </div>

                {/* Time */}
                <div className="flex items-center gap-2">
                    <label
                        htmlFor={`time-${candidate.tempId}`}
                        className="text-sm min-w-[80px]"
                    >
                        {t("time")}:
                    </label>
                    <input
                        id={`time-${candidate.tempId}`}
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
                    <label
                        htmlFor={`comment-${candidate.tempId}`}
                        className="text-sm min-w-[80px]"
                    >
                        {t("comment")}:
                    </label>
                    <input
                        id={`comment-${candidate.tempId}`}
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
