import dayjs from "dayjs";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useShallow } from "zustand/shallow";
import { StorageAPI } from "@/api/storage";
import CloudLoopIcon from "@/assets/icons/cloud-loop.svg?react";
import AnimatedNumber from "@/components/animated-number";
import { showBookGuide } from "@/components/book/util";
import BudgetCard from "@/components/budget/card";
import { HintTooltip } from "@/components/hint";
import { PaginationIndicator } from "@/components/indicator";
import Ledger from "@/components/ledger";
import Loading from "@/components/loading";
import { Promotion } from "@/components/promotion";
import { useBudget } from "@/hooks/use-budget";
import { useSnap } from "@/hooks/use-snap";
import { amountToNumber } from "@/ledger/bill";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";
import { filterOrderedBillListByTimeRange } from "@/utils/filter";
import { denseDate } from "@/utils/time";

let ledgerAnimationShows = false;

export default function Page() {
    const t = useIntl();

    const { bills, loading, sync } = useLedgerStore();
    const currentBook = useBookStore(
        useShallow((state) => {
            const { currentBookId, books } = state;
            return books.find((b) => b.id === currentBookId);
        }),
    );
    const showAssets = usePreferenceStore(
        useShallow((state) => state.showAssetsInLedger),
    );
    const { id: userId } = useUserStore();
    const syncIconClassName =
        sync === "wait"
            ? "icon-[mdi--cloud-minus-outline]"
            : sync === "syncing"
              ? "icon-[line-md--cloud-alt-print-loop]"
              : sync === "success"
                ? "icon-[mdi--cloud-check-outline]"
                : "icon-[mdi--cloud-remove-outline] text-red-600";

    const [currentDate, setCurrentDate] = useState(dayjs());
    const [homeScope, setHomeScope] = useState<"me" | "all">("me");
    const ledgerRef = useRef<any>(null);

    const currentDateBills = useMemo(() => {
        const today = filterOrderedBillListByTimeRange(bills, [
            currentDate.startOf("day"),
            currentDate.endOf("day"),
        ]);
        return today;
    }, [bills, currentDate]);

    const currentDateAmount = useMemo(() => {
        return amountToNumber(
            currentDateBills.reduce((p, c) => {
                return p + c.amount * (c.type === "income" ? 1 : -1);
            }, 0),
        );
    }, [currentDateBills]);

    const filteredBills = useMemo(() => {
        return homeScope === "me"
            ? bills.filter((b) => String(b.creatorId) === String(userId))
            : bills;
    }, [bills, homeScope, userId]);

    const sumByType = (
        list: typeof bills,
        type: "expense" | "income",
    ) =>
        amountToNumber(
            list
                .filter((b) => b.type === type)
                .reduce((p, c) => p + c.amount, 0),
        );

    const todayBills = useMemo(
        () =>
            filterOrderedBillListByTimeRange(filteredBills, [
                currentDate.startOf("day"),
                currentDate.endOf("day"),
            ]),
        [filteredBills, currentDate],
    );

    const monthBills = useMemo(
        () =>
            filterOrderedBillListByTimeRange(filteredBills, [
                currentDate.startOf("month"),
                currentDate.endOf("month"),
            ]),
        [filteredBills, currentDate],
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const todayExpense = useMemo(() => sumByType(todayBills, "expense"), [todayBills]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const todayIncome = useMemo(() => sumByType(todayBills, "income"), [todayBills]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const monthExpense = useMemo(() => sumByType(monthBills, "expense"), [monthBills]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const monthIncome = useMemo(() => sumByType(monthBills, "income"), [monthBills]);

    const { budgets: allBudgets } = useBudget();
    const budgets = allBudgets.filter((b) => {
        return b.joiners.includes(userId) && b.start < Date.now();
    });

    const budgetContainer = useRef<HTMLDivElement>(null);
    const { count: budgetCount, index: curBudgetIndex } = useSnap(
        budgetContainer,
        0,
    );

    const allLoaded = useRef(false);
    // 有预算时需要加载全部bills
    useLayoutEffect(() => {
        if (!allLoaded.current && budgets.length > 0) {
            useLedgerStore.getState().refreshBillList();
            allLoaded.current = true;
        }
    }, [budgets.length]);

    // 滚动时需要加载全部bills
    const onDateClick = useCallback(
        (date: dayjs.Dayjs) => {
            setCurrentDate(date);
            const index = bills.findIndex((bill) => {
                const billDate = dayjs.unix(bill.time / 1000);
                return billDate.isSame(date, "day");
            });
            if (index >= 0) {
                ledgerRef.current?.scrollToIndex(index);
            }
        },
        [bills],
    );

    const onItemShow = useCallback((index: number) => {
        if (!allLoaded.current && index >= 120) {
            useLedgerStore.getState().refreshBillList();
            allLoaded.current = true;
        }
    }, []);

    const presence = useMemo(() => {
        if (ledgerAnimationShows) {
            return false;
        }
        return true;
    }, []);

    // safari capable
    useEffect(() => {
        ledgerAnimationShows = true;
    }, []);
    return (
        <div className="w-full h-full p-2 flex flex-col overflow-hidden page-show">
            <div className="flex flex-wrap flex-col w-full gap-2">
                <div className="bg-stone-900 text-white w-full rounded-xl p-3.5 flex flex-col gap-2.5 sm:flex-1">
                    {/* 日期 + 仅自己/全家切换 */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">
                            {denseDate(currentDate)}
                        </span>
                        <div className="flex bg-white/8 rounded-full p-0.5 text-[11px] gap-0.5 cursor-pointer">
                            <button
                                type="button"
                                onClick={() => setHomeScope("me")}
                                className={cn(
                                    "px-2.5 py-0.5 rounded-full transition-colors duration-150",
                                    homeScope === "me"
                                        ? "bg-white/18 text-white"
                                        : "text-white/40 hover:text-white/60",
                                )}
                            >
                                {t("only-me")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setHomeScope("all")}
                                className={cn(
                                    "px-2.5 py-0.5 rounded-full transition-colors duration-150",
                                    homeScope === "all"
                                        ? "bg-white/18 text-white"
                                        : "text-white/40 hover:text-white/60",
                                )}
                            >
                                {t("all-members")}
                            </button>
                        </div>
                    </div>

                    {/* 四项统计：今日支出/收入 | 本月支出/收入 */}
                    <div className="flex items-center gap-3">
                        <div className="flex gap-3 flex-1">
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-white/40 mb-0.5">
                                    {t("today-expense")}
                                </div>
                                <AnimatedNumber
                                    value={todayExpense}
                                    className="text-base font-bold text-rose-300 tabular-nums"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-white/40 mb-0.5">
                                    {t("today-income")}
                                </div>
                                <AnimatedNumber
                                    value={todayIncome}
                                    className="text-base font-bold text-emerald-300 tabular-nums"
                                />
                            </div>
                        </div>
                        <div className="w-px self-stretch bg-white/10 my-0.5" />
                        <div className="flex gap-3 flex-1">
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-white/40 mb-0.5">
                                    {t("month-expense")}
                                </div>
                                <AnimatedNumber
                                    value={monthExpense}
                                    className="text-base font-bold text-rose-300/70 tabular-nums"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-white/40 mb-0.5">
                                    {t("month-income")}
                                </div>
                                <AnimatedNumber
                                    value={monthIncome}
                                    className="text-base font-bold text-emerald-300/70 tabular-nums"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 账本名 */}
                    {currentBook && (
                        <button
                            type="button"
                            className="text-[10px] text-white/35 flex items-center gap-1 cursor-pointer w-fit hover:text-white/55 transition-colors duration-150"
                            onClick={() => {
                                showBookGuide();
                            }}
                        >
                            <i className="icon-[mdi--book-outline]"></i>
                            {currentBook.name}
                        </button>
                    )}
                </div>
                <Promotion />
                <div className="w-full flex flex-col gap-1">
                    <div
                        ref={budgetContainer}
                        className="w-full flex overflow-x-auto gap-2 scrollbar-hidden snap-mandatory snap-x"
                    >
                        {budgets.map((budget) => {
                            return (
                                <BudgetCard
                                    className="flex-shrink-0 snap-start"
                                    key={budget.id}
                                    budget={budget}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center pl-7 pr-5 py-1 h-8">
                <button
                    className="cursor-pointer flex items-center"
                    type="button"
                    onClick={() => {
                        if (loading) {
                            return;
                        }
                        useLedgerStore.getState().initCurrentBook();
                    }}
                >
                    <div className={cn("opacity-0", loading && "opacity-100")}>
                        <Loading className="[&_i]:size-[18px]" />
                    </div>
                </button>
                <div>
                    {budgetCount > 1 && (
                        <PaginationIndicator
                            count={budgetCount}
                            current={curBudgetIndex}
                        />
                    )}
                </div>
                <HintTooltip
                    persistKey={"cloudSyncHintShows"}
                    content={"等待云同步完成后，其他设备即可获取最新的账单数据"}
                >
                    <button
                        type="button"
                        className="cursor-pointer flex items-center"
                        onClick={() => {
                            StorageAPI.toSync();
                        }}
                    >
                        {sync === "syncing" ? (
                            <CloudLoopIcon width={18} height={18} />
                        ) : (
                            <i
                                className={cn(syncIconClassName, "size-[18px]")}
                            ></i>
                        )}
                    </button>
                </HintTooltip>
            </div>
            <div className="flex-1 translate-0 pb-[10px] overflow-hidden">
                <div className="w-full h-full">
                    {bills.length > 0 ? (
                        <Ledger
                            ref={ledgerRef}
                            bills={bills}
                            className={cn(bills.length > 0 && "relative")}
                            enableDivideAsOrdered
                            showTime
                            onItemShow={onItemShow}
                            onVisibleDateChange={setCurrentDate}
                            onDateClick={onDateClick}
                            presence={presence}
                            showAssets={showAssets}
                        />
                    ) : (
                        <div className="text-xs p-4 text-center">
                            {t("nothing-here-add-one-bill")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
