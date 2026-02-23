import type { MerchantCategoryRecord, MerchantMemory } from "@/ledger/type";
import { useLedgerStore } from "@/store/ledger";
import type { CandidateBill } from "./types";

/** 标准化商户名：去首尾空格 + 转小写，用于记忆表的 key */
export function normalizeMerchant(name: string): string {
    return name.trim().toLowerCase();
}

/**
 * 在 AI 解析完成后，将商户记忆应用到候选账单列表。
 *
 * 对每条有 merchant 字段的候选账单：
 * - 填充 memorySuggestions（该商户的历史分类记录，按 count 降序）
 * - 保存 aiCategoryId（AI 原始推断的分类）
 * - 若有记忆，将 categoryId 覆盖为使用次数最多的历史分类
 */
export function applyMerchantMemory(
    candidates: CandidateBill[],
    memory: MerchantMemory,
): CandidateBill[] {
    return candidates.map((candidate) => {
        if (!candidate.merchant) return candidate;

        const key = normalizeMerchant(candidate.merchant);
        const records = memory[key];

        if (!records || records.length === 0) return candidate;

        // 按 count 降序排列（存储时已排序，但防御性排一次）
        const sorted = [...records].sort((a, b) => b.count - a.count);

        return {
            ...candidate,
            memorySuggestions: sorted,
            aiCategoryId: candidate.categoryId,
            categoryId: sorted[0].categoryId,
        };
    });
}

/**
 * 用户确认账单后，将该次商户→分类的使用记录写入 GlobalMeta。
 *
 * 逻辑：
 * - 若该商户+分类组合已存在 → count+1，更新 lastUsed
 * - 若该商户已有记录但分类不同 → 追加新条目
 * - 若该商户无任何记录 → 新建
 * - 写入后按 count 降序排列
 */
export async function saveMerchantMemoryEntry(
    merchant: string,
    categoryId: string,
): Promise<void> {
    const key = normalizeMerchant(merchant);
    const now = Date.now();

    const { updateGlobalMeta, infos } = useLedgerStore.getState();
    const currentMemory: MerchantMemory = infos?.meta.merchantMemory ?? {};

    const existingRecords: MerchantCategoryRecord[] = currentMemory[key]
        ? [...currentMemory[key]]
        : [];

    const existingIndex = existingRecords.findIndex(
        (r) => r.categoryId === categoryId,
    );

    if (existingIndex >= 0) {
        existingRecords[existingIndex] = {
            ...existingRecords[existingIndex],
            count: existingRecords[existingIndex].count + 1,
            lastUsed: now,
        };
    } else {
        existingRecords.push({ categoryId, count: 1, lastUsed: now });
    }

    const sorted = existingRecords.sort((a, b) => b.count - a.count);

    await updateGlobalMeta((prev) => ({
        ...prev,
        merchantMemory: {
            ...currentMemory,
            [key]: sorted,
        },
    }));
}
