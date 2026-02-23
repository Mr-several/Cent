import dayjs from "dayjs";
import { useState } from "react";
import { toast } from "sonner";
import CategoryIcon from "@/components/category/icon";
import { DatePicker } from "@/components/date-picker";
import useCategory from "@/hooks/use-category";
import { useTag } from "@/hooks/use-tag";
import { amountToNumber, numberToAmount } from "@/ledger/bill";
import type {
    BillCategory,
    BillType,
    MerchantCategoryRecord,
} from "@/ledger/type";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { useReceiptStore } from "@/store/receipt";
import { cn } from "@/utils";
import { showCategoryList } from "../category";
import { showTagList } from "../bill-tag";
import { Button } from "../ui/button";
import type { CandidateBill } from "./types";

interface CandidateRecordItemProps {
    candidate: CandidateBill;
    index: number;
    total: number;
}

type TreeCategory = BillCategory & { children: BillCategory[] };

/**
 * 商户记忆分类建议 Chip 列表
 * 展示历史记忆分类（按使用次数降序）+ AI 推断分类（末尾）
 * 点击任意 Chip 直接切换当前分类选择
 */
function MerchantMemorySuggestions({
    memorySuggestions,
    aiCategoryId,
    selectedCategoryId,
    type,
    onSelect,
    disabled,
}: {
    memorySuggestions: MerchantCategoryRecord[];
    aiCategoryId?: string;
    selectedCategoryId?: string;
    type: BillType;
    onSelect: (categoryId: string) => void;
    disabled?: boolean;
}) {
    const { expenses, incomes } = useCategory();
    const t = useIntl();

    const allCategories =
        type === "expense"
            ? expenses.flatMap((p) => [p, ...p.children])
            : incomes.flatMap((p) => [p, ...p.children]);

    const findCategory = (id: string) => allCategories.find((c) => c.id === id);

    // 去掉与记忆重复的 AI 分类（如果 AI 和最高频记忆一致，不重复显示）
    const aiIsAlreadyInMemory = memorySuggestions.some(
        (r) => r.categoryId === aiCategoryId,
    );
    const showAiChip = aiCategoryId && !aiIsAlreadyInMemory;

    return (
        <div className="mb-1 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
                <i className="icon-[mdi--brain] text-xs" />
                {t("receipt-memory-suggestions")}
            </p>
            {/* 横向可滚动 Chip 列表，touch 优化 */}
            <div
                className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
                style={{ touchAction: "pan-x" }}
            >
                {memorySuggestions.map((record) => {
                    const cat = findCategory(record.categoryId);
                    if (!cat) return null;
                    const isSelected = selectedCategoryId === record.categoryId;
                    return (
                        <button
                            key={record.categoryId}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelect(record.categoryId)}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium",
                                "min-h-[32px] border transition-colors duration-150 cursor-pointer",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-muted/60 text-foreground border-border hover:bg-muted hover:border-muted-foreground/40",
                                disabled && "opacity-50 cursor-not-allowed",
                            )}
                        >
                            <CategoryIcon
                                icon={cat.icon}
                                className="w-3.5 h-3.5 flex-shrink-0"
                            />
                            <span>{cat.name}</span>
                            {record.count >= 2 && (
                                <span
                                    className={cn(
                                        "text-[10px] font-normal",
                                        isSelected
                                            ? "text-primary-foreground/70"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {t("receipt-memory-times", {
                                        count: record.count,
                                    })}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* AI 推断 Chip —— 固定在末尾，虚线琥珀色风格 */}
                {showAiChip &&
                    (() => {
                        const cat = findCategory(aiCategoryId);
                        if (!cat) return null;
                        const isSelected = selectedCategoryId === aiCategoryId;
                        return (
                            <button
                                key="ai-inferred"
                                type="button"
                                disabled={disabled}
                                onClick={() => onSelect(aiCategoryId)}
                                className={cn(
                                    "flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium",
                                    "min-h-[32px] border border-dashed transition-colors duration-150 cursor-pointer",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isSelected
                                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500"
                                        : "bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/50 hover:bg-amber-500/10 hover:border-amber-500/70",
                                    disabled && "opacity-50 cursor-not-allowed",
                                )}
                            >
                                <i className="icon-[mdi--auto-fix] w-3.5 h-3.5 flex-shrink-0" />
                                <span>{cat.name}</span>
                                <span className="text-[10px] font-normal opacity-70">
                                    {t("receipt-memory-ai-label")}
                                </span>
                            </button>
                        );
                    })()}
            </div>
        </div>
    );
}

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
    const { tags: allTags, grouped: tagGrouped } = useTag();
    const recentReceiptTagIdsRaw = usePreferenceStore(
        (s) => s.recentReceiptTagIds,
    );
    const recentReceiptTagIds = recentReceiptTagIdsRaw ?? [];
    // 无历史记录时，回退展示全部可用标签前 5 个
    const quickTagIds =
        recentReceiptTagIds.length > 0
            ? recentReceiptTagIds.slice(0, 5)
            : allTags.slice(0, 5).map((tag) => tag.id);
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
                {/* Type — pill toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-sm min-w-[80px]">{t("type")}:</span>
                    <div className="flex gap-1.5">
                        {(["expense", "income"] as BillType[]).map((t_) => (
                            <button
                                key={t_}
                                type="button"
                                disabled={isConfirmed}
                                onClick={() => handleFieldChange("type", t_)}
                                className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                    billType === t_
                                        ? t_ === "expense"
                                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/50"
                                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/50"
                                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/70",
                                    isConfirmed &&
                                        "opacity-50 cursor-not-allowed",
                                )}
                            >
                                {t(t_)}
                            </button>
                        ))}
                    </div>
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
                    <div className="flex-1 space-y-1.5">
                        {/* 商户记忆分类建议 Chip（仅当商户有历史记忆时展示） */}
                        {candidate.memorySuggestions &&
                            candidate.memorySuggestions.length > 0 && (
                                <MerchantMemorySuggestions
                                    memorySuggestions={
                                        candidate.memorySuggestions
                                    }
                                    aiCategoryId={candidate.aiCategoryId}
                                    selectedCategoryId={candidate.categoryId}
                                    type={billType}
                                    onSelect={(id) =>
                                        handleFieldChange("categoryId", id)
                                    }
                                    disabled={isConfirmed}
                                />
                            )}
                        <CategoryPicker
                            value={candidate.categoryId}
                            onChange={(id) =>
                                handleFieldChange("categoryId", id)
                            }
                            type={billType}
                            disabled={isConfirmed}
                        />
                        {/* 编辑分类入口 — 风格与编辑标签保持一致 */}
                        {!isConfirmed && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => showCategoryList(billType)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 transition-colors cursor-pointer"
                                >
                                    <i className="icon-[mdi--pencil-outline] w-3.5 h-3.5" />
                                    {t("receipt-category-edit")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Time — DatePicker */}
                <div className="flex items-center gap-2">
                    <span className="text-sm min-w-[80px]">{t("time")}:</span>
                    <div
                        className={cn(
                            "flex-1 px-3 py-1.5 border rounded-lg text-sm transition-colors",
                            isConfirmed
                                ? "opacity-60 cursor-not-allowed bg-muted"
                                : "hover:bg-muted/40 cursor-pointer",
                        )}
                    >
                        <DatePicker
                            fixedTime
                            value={candidate.time ?? Date.now()}
                            onChange={(ts) => handleFieldChange("time", ts)}
                            displayFormatter={(d) =>
                                d?.format("YYYY/MM/DD HH:mm") ?? ""
                            }
                        />
                    </div>
                </div>

                {/* Tags — 最近使用快选（最多5个）+ 编辑按钮 */}
                {allTags.length > 0 && (
                    <div className="flex items-start gap-2">
                        <span className="text-sm min-w-[80px] mt-1.5">
                            {t("receipt-tags-label")}:
                        </span>
                        <div
                            className="flex-1 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-wrap"
                            style={{ touchAction: "pan-x" }}
                        >
                            {/* 最近使用的 tag（最多5条），无历史时回退展示全部标签前5个 */}
                            {quickTagIds.map((tagId) => {
                                const tag = allTags.find(
                                    (tg) => tg.id === tagId,
                                );
                                if (!tag) return null;
                                const group = tagGrouped.find((g) =>
                                    g.tagIds?.includes(tagId),
                                );
                                const color = group?.color ?? "gray";
                                const isSelected = (
                                    candidate.tagIds ?? []
                                ).includes(tagId);
                                return (
                                    <button
                                        key={tagId}
                                        type="button"
                                        disabled={isConfirmed}
                                        onClick={() => {
                                            const current =
                                                candidate.tagIds ?? [];
                                            handleFieldChange(
                                                "tagIds",
                                                isSelected
                                                    ? current.filter(
                                                          (id) => id !== tagId,
                                                      )
                                                    : [...current, tagId],
                                            );
                                        }}
                                        className={cn(
                                            "flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                            `with-tag-color tag-${color}`,
                                            isSelected
                                                ? "bg-[var(--current-tag-color)]/15 text-[var(--current-tag-color)] border-[var(--current-tag-color)]/60"
                                                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/70",
                                            isConfirmed &&
                                                "opacity-50 cursor-not-allowed",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "w-2 h-2 rounded-full bg-[var(--current-tag-color)] flex-shrink-0",
                                                !isSelected && "opacity-40",
                                            )}
                                        />
                                        #{tag.name}
                                    </button>
                                );
                            })}
                            {/* 编辑标签按钮 */}
                            {!isConfirmed && (
                                <button
                                    type="button"
                                    onClick={() => showTagList()}
                                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 transition-colors"
                                >
                                    <i className="icon-[mdi--tag-plus-outline] w-3.5 h-3.5" />
                                    {t("receipt-tags-edit")}
                                </button>
                            )}
                        </div>
                    </div>
                )}

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
