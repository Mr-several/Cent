import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import type {
    CandidateBill,
    RecognitionSession,
} from "@/components/receipt-recognition/types";
import type { Bill } from "@/ledger/type";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";

interface ReceiptStore {
    currentSession: RecognitionSession | null;

    // Actions
    startSession: (images: File[]) => void;
    addCandidates: (candidates: CandidateBill[]) => void;
    updateCandidate: (tempId: string, updates: Partial<CandidateBill>) => void;
    deleteCandidate: (tempId: string) => void;
    confirmCandidate: (tempId: string) => Promise<void>;
    setProcessingDuration: (ms: number) => void;

    // Batch actions (only affect pending records)
    confirmAllPending: () => Promise<{ succeeded: number; skipped: number }>;
    deleteAllPending: () => void;

    // Global settings
    setGlobalTime: (time: number) => void;
    setGlobalType: (type: "income" | "expense") => void;
    applyGlobalTimeToAll: () => void;
    applyGlobalTypeToAll: () => void;

    clearSession: () => void;
}

export const useReceiptStore = create<ReceiptStore>((set, get) => ({
    currentSession: null,

    startSession: (images: File[]) => {
        set({
            currentSession: {
                id: uuidv4(),
                images,
                candidates: [],
                createdAt: Date.now(),
            },
        });
    },

    addCandidates: (candidates: CandidateBill[]) => {
        set((state) => {
            if (!state.currentSession) return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    candidates: [
                        ...state.currentSession.candidates,
                        ...candidates,
                    ],
                },
            };
        });
    },

    updateCandidate: (tempId: string, updates: Partial<CandidateBill>) => {
        set((state) => {
            if (!state.currentSession) return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    candidates: state.currentSession.candidates.map(
                        (c: CandidateBill) =>
                            c.tempId === tempId ? { ...c, ...updates } : c,
                    ),
                },
            };
        });
    },

    deleteCandidate: (tempId: string) => {
        set((state) => {
            if (!state.currentSession) return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    candidates: state.currentSession.candidates.filter(
                        (c: CandidateBill) => c.tempId !== tempId,
                    ),
                },
            };
        });
    },

    confirmCandidate: async (tempId: string) => {
        const state = get();
        const candidate = state.currentSession?.candidates.find(
            (c: CandidateBill) => c.tempId === tempId,
        );
        if (!candidate || !state.currentSession) return;

        // Validate required fields
        if (!candidate.amount || !candidate.categoryId) {
            throw new Error("金额和分类为必填项");
        }

        // Build Bill object
        const bill: Bill = {
            id: uuidv4(),
            type: candidate.type || "expense",
            amount: candidate.amount,
            categoryId: candidate.categoryId,
            time: candidate.time || Date.now(),
            comment: candidate.comment,
            tagIds: candidate.tagIds,
            creatorId: useUserStore.getState().id,
            images: candidate.attachImage
                ? [state.currentSession.images[candidate.sourceImageIndex]]
                : undefined,
        };

        // Save to database
        await useLedgerStore.getState().addBill(bill);

        // Update candidate status
        get().updateCandidate(tempId, { status: "confirmed" });
    },

    setProcessingDuration: (ms: number) => {
        set((state) => {
            if (!state.currentSession) return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    processingDuration: ms,
                },
            };
        });
    },

    confirmAllPending: async () => {
        const pendingCandidates = (
            get().currentSession?.candidates ?? []
        ).filter((c: CandidateBill) => c.status === "pending");

        let succeeded = 0;
        let skipped = 0;

        for (const candidate of pendingCandidates) {
            try {
                await get().confirmCandidate(candidate.tempId);
                succeeded++;
            } catch {
                skipped++;
            }
        }

        return { succeeded, skipped };
    },

    deleteAllPending: () => {
        set((state) => {
            if (!state.currentSession) return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    candidates: state.currentSession.candidates.filter(
                        (c: CandidateBill) => c.status !== "pending",
                    ),
                },
            };
        });
    },

    setGlobalTime: (time: number) => {
        set((state) => {
            if (!state.currentSession) return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    globalTime: time,
                },
            };
        });
    },

    setGlobalType: (type: "income" | "expense") => {
        set((state) => {
            if (!state.currentSession) return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    globalType: type,
                },
            };
        });
    },

    applyGlobalTimeToAll: () => {
        set((state) => {
            if (!state.currentSession || !state.currentSession.globalTime)
                return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    candidates: state.currentSession.candidates.map(
                        (c: CandidateBill) =>
                            c.status === "pending"
                                ? {
                                      ...c,
                                      time: state.currentSession!.globalTime,
                                  }
                                : c,
                    ),
                },
            };
        });
    },

    applyGlobalTypeToAll: () => {
        set((state) => {
            if (!state.currentSession || !state.currentSession.globalType)
                return state;
            return {
                currentSession: {
                    ...state.currentSession,
                    candidates: state.currentSession.candidates.map(
                        (c: CandidateBill) =>
                            c.status === "pending"
                                ? {
                                      ...c,
                                      type: state.currentSession!.globalType,
                                  }
                                : c,
                    ),
                },
            };
        });
    },

    clearSession: () => {
        set({ currentSession: null });
    },
}));
