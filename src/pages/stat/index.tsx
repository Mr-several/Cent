import dayjs from "dayjs";
import { Switch } from "radix-ui";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useShallow } from "zustand/shallow";
import { analysis as runAnalysis } from "@/api/storage/analysis";
import { StorageDeferredAPI } from "@/api/storage";
import type { AnalysisResult } from "@/api/storage/analysis";
import { Assistant } from "@/components/assistant";
import {
  BillFilterViewProvider,
  showBillFilterView,
} from "@/components/bill-filter";
import { showBillInfo } from "@/components/bill-info";
import BillItem from "@/components/ledger/item";
import { showSortableList } from "@/components/sortable";
import { AnalysisCloud } from "@/components/stat/analysic-cloud";
import { AnalysisDetail } from "@/components/stat/analysis-detail";
import AnalysisMap from "@/components/stat/analysis-map";
import { QuickMetrics } from "@/components/stat/quick-metrics";
import { useChartPart } from "@/components/stat/chart-part";
import { DateSliced, useDateSliced } from "@/components/stat/date-slice";
import {
  type FocusType,
  FocusTypeSelector,
  FocusTypes,
} from "@/components/stat/focus-type";
import { TagItem } from "@/components/stat/static-item";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/use-currency";
import {
  DefaultFilterViewId,
  useCustomFilters,
} from "@/hooks/use-custom-filters";
import { useCreators } from "@/hooks/use-creator";
import { useTag } from "@/hooks/use-tag";
import useCategory from "@/hooks/use-category";
import { amountToNumber } from "@/ledger/bill";
import type { BillFilter, BillFilterView } from "@/ledger/extra-type";
import type { Bill } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useAssistantStore } from "@/store/assistant";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";

type CategoryPeriodTotals = Map<string, { name: string; total: number }>;

type CategoryComparison = {
  baselineLabel: string;
  topIncrease: {
    id: string;
    name: string;
    delta: number;
  }[];
  topDecrease: {
    id: string;
    name: string;
    delta: number;
  }[];
};

const getRangeShiftedBy = (
  range: [number, number],
  offset: number,
): [number, number] => {
  const duration = range[1] - range[0];
  return [range[0] - duration * offset, range[1] - duration * offset];
};

export default function Page() {
  const t = useIntl();
  const { id } = useParams();

  useEffect(() => {
    useAssistantStore.setState((prev) => ({
      ...prev,
      isCollapsed: true,
    }));
  }, []);

  const { bills } = useLedgerStore();
  const endTime = useMemo(() => Date.now(), []); //bills[0]?.time ?? dayjs();
  const startTime = bills[bills.length - 1]?.time ?? dayjs();

  const customFilters = useLedgerStore(
    useShallow((state) => state.infos?.meta.customFilters),
  );

  const allFilterViews = useMemo(() => {
    if (customFilters?.some((f) => f.id === DefaultFilterViewId)) {
      return customFilters;
    }
    return [
      {
        id: DefaultFilterViewId,
        filter: {},
        name: t("default-filter-name"),
      } as BillFilterView,
      ...(customFilters ?? []),
    ];
  }, [t, customFilters]);

  const [filterViewId, setFilterViewId] = useState(id ?? allFilterViews[0].id);

  const selectedFilterView = allFilterViews.find((v) => v.id === filterViewId);
  const selectedFilter = selectedFilterView?.filter;

  const fullRange = [
    selectedFilter?.start ?? startTime,
    selectedFilter?.end ?? endTime,
  ] as [number, number];

  const {
    sliceRange,
    viewType,
    props: dateSlicedProps,
    setSliceId,
  } = useDateSliced({
    range: fullRange,
    selectCustomSliceWhenInitial: Boolean(id),
  });
  const realRange = useMemo(
    () => [
      sliceRange?.[0] ?? selectedFilter?.start ?? startTime,
      sliceRange?.[1] ?? selectedFilter?.end ?? endTime,
    ],
    [
      sliceRange,
      selectedFilter?.start,
      selectedFilter?.end,
      startTime,
      endTime,
    ],
  );

  const [focusType, setFocusType] = useState<FocusType>("expense");
  const [dimension, setDimension] = useState<"category" | "user">("user");
  const creators = useCreators();
  const { id: currentUserId, name: currentUserName } = useUserStore();
  const [creatorScope, setCreatorScope] = useState<"me" | "all" | string>("me");

  const scopedCreators = useMemo(() => {
    if (dimension !== "user") {
      return selectedFilter?.creators;
    }
    const baseCreators = selectedFilter?.creators?.map(String);
    const selfCreatorIds = creators
      .filter((creator) => {
        const sameId = String(creator.id) === String(currentUserId);
        const sameName =
          creator.name === currentUserName ||
          creator.originalName === currentUserName;
        return sameId || sameName;
      })
      .map((creator) => String(creator.id));
    if (selfCreatorIds.length === 0 && creators.length === 1) {
      selfCreatorIds.push(String(creators[0].id));
    }
    const scopeCreators =
      creatorScope === "all"
        ? undefined
        : creatorScope === "me"
          ? selfCreatorIds
          : [creatorScope];
    if (!scopeCreators) {
      return baseCreators;
    }
    if (scopeCreators.length === 0) {
      return baseCreators;
    }
    if (!baseCreators || baseCreators.length === 0) {
      return scopeCreators;
    }
    return baseCreators.filter((id) => scopeCreators.includes(id));
  }, [
    creatorScope,
    creators,
    currentUserId,
    currentUserName,
    dimension,
    selectedFilter?.creators,
  ]);

  const effectiveFilter = useMemo<BillFilter>(() => {
    return {
      ...(selectedFilter ?? {}),
      creators: scopedCreators,
    };
  }, [selectedFilter, scopedCreators]);
  const { categories } = useCategory();

  const navigate = useNavigate();
  const seeDetails = (append?: Partial<BillFilter>) => {
    navigate("/search", {
      state: {
        filter: {
          ...effectiveFilter,
          start: realRange[0],
          end: realRange[1],
          ...append,
        },
      },
    });
  };

  const [filtered, setFiltered] = useState<Bill[]>([]);
  const [previousFiltered, setPreviousFiltered] = useState<Bill[]>([]);
  const [previous2Filtered, setPrevious2Filtered] = useState<Bill[]>([]);

  useEffect(() => {
    const book = useBookStore.getState().currentBookId;
    if (!book) {
      return;
    }
    StorageDeferredAPI.filter(book, {
      ...effectiveFilter,
      start: realRange[0],
      end: realRange[1],
    }).then((result) => {
      setFiltered(result);
    });
  }, [effectiveFilter, realRange[0], realRange[1]]);

  useEffect(() => {
    const book = useBookStore.getState().currentBookId;
    if (!book || !realRange[0] || !realRange[1]) {
      setPreviousFiltered([]);
      setPrevious2Filtered([]);
      return;
    }
    const prevRange = getRangeShiftedBy(
      [realRange[0], realRange[1]] as [number, number],
      1,
    );
    const prev2Range = getRangeShiftedBy(
      [realRange[0], realRange[1]] as [number, number],
      2,
    );
    Promise.all([
      StorageDeferredAPI.filter(book, {
        ...effectiveFilter,
        start: prevRange[0],
        end: prevRange[1],
      }),
      StorageDeferredAPI.filter(book, {
        ...effectiveFilter,
        start: prev2Range[0],
        end: prev2Range[1],
      }),
    ]).then(([prev, prev2]) => {
      setPreviousFiltered(prev);
      setPrevious2Filtered(prev2);
    });
  }, [effectiveFilter, realRange]);

  const structureDimension =
    dimension === "user" && creatorScope !== "all" ? "category" : dimension;

  const { dataSources, Part, setSelectedCategoryId } = useChartPart({
    viewType,
    seeDetails,
    focusType,
    filtered,
    dimension,
    structureDimension,
    displayCurrency: selectedFilterView?.displayCurrency,
  });

  const totalMoneys = FocusTypes.map((t) => dataSources.total[t]);

  const previousTotalMoneys = useMemo(() => {
    if (previousFiltered.length === 0) return undefined;
    let prevIncome = 0;
    let prevExpense = 0;
    for (const bill of previousFiltered) {
      if (bill.type === "income") {
        prevIncome += bill.amount;
      } else {
        prevExpense += bill.amount;
      }
    }
    return [
      amountToNumber(prevIncome),
      amountToNumber(prevExpense),
      amountToNumber(prevIncome - prevExpense),
    ];
  }, [previousFiltered]);

  const { tags } = useTag();
  const tagStructure = useMemo(
    () =>
      Array.from(dataSources.tagStructure.entries())
        .map(([tagId, struct]) => {
          const tag = tags.find((t) => t.id === tagId);
          if (!tag) {
            return undefined;
          }
          return {
            ...tag,
            ...struct,
          };
        })
        .filter((v) => v !== undefined),
    [dataSources.tagStructure, tags],
  );

  const { incomes: filteredIncomeBills, expenses: filteredExpenseBills } =
    useMemo(() => {
      const incomes: Bill[] = [];
      const expenses: Bill[] = [];
      filtered.forEach((v) => {
        if (v.type === "expense") {
          expenses.push(v);
        } else {
          incomes.push(v);
        }
      });
      return {
        incomes,
        expenses,
      };
    }, [filtered]);

  const [topPercent, setTopPercent] = useState(20);
  const topBills = useMemo(() => {
    const threshold = topPercent / 100;
    const sortAndAccumulate = (bills: Bill[]) => {
      const sorted = [...bills].sort((a, b) => b.amount - a.amount);
      const totalAmount = sorted.reduce((s, b) => s + b.amount, 0);
      const target = totalAmount * threshold;
      const top: Bill[] = [];
      let accumulated = 0;
      for (const bill of sorted) {
        top.push(bill);
        accumulated += bill.amount;
        if (accumulated >= target) break;
      }
      return { top, totalAmount, accumulated };
    };
    return {
      expense:
        focusType !== "income"
          ? sortAndAccumulate(filteredExpenseBills)
          : null,
      income:
        focusType !== "expense"
          ? sortAndAccumulate(filteredIncomeBills)
          : null,
    };
  }, [filteredExpenseBills, filteredIncomeBills, topPercent, focusType]);

  const aggregateCategoryTotals = useMemo(() => {
    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );
    return (bills: Bill[]): CategoryPeriodTotals => {
      const totals: CategoryPeriodTotals = new Map();
      for (const bill of bills) {
        const category = categoryMap.get(bill.categoryId);
        const parent = category?.parent
          ? categoryMap.get(category.parent)
          : category;
        const parentId = parent?.id ?? category?.id ?? bill.categoryId;
        const parentName = parent?.name ?? category?.name ?? bill.categoryId;
        const prev = totals.get(parentId)?.total ?? 0;
        let signedAmount = bill.amount;
        if (focusType === "expense") {
          if (bill.type !== "expense") continue;
          signedAmount = bill.amount;
        } else if (focusType === "income") {
          if (bill.type !== "income") continue;
          signedAmount = bill.amount;
        } else {
          signedAmount = bill.type === "income" ? bill.amount : -bill.amount;
        }
        totals.set(parentId, {
          name: parentName,
          total: prev + signedAmount,
        });
      }
      return totals;
    };
  }, [categories, focusType]);

  const categoryComparisons = useMemo<CategoryComparison[]>(() => {
    const buildComparison = (
      current: CategoryPeriodTotals,
      baseline: CategoryPeriodTotals,
      baselineLabel: string,
    ): CategoryComparison => {
      const allIds = new Set([...current.keys(), ...baseline.keys()]);
      const diff = Array.from(allIds)
        .map((id) => {
          const currentItem = current.get(id);
          const baselineItem = baseline.get(id);
          const currentTotal = currentItem?.total ?? 0;
          const baselineTotal = baselineItem?.total ?? 0;
          return {
            id,
            name: currentItem?.name ?? baselineItem?.name ?? id,
            delta: currentTotal - baselineTotal,
          };
        })
        .filter((item) => item.delta !== 0);
      const topIncrease = [...diff]
        .filter((item) => item.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 3);
      const topDecrease = [...diff]
        .filter((item) => item.delta < 0)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 3);
      return { baselineLabel, topIncrease, topDecrease };
    };

    const currentTotals = aggregateCategoryTotals(filtered);
    const prevTotals = aggregateCategoryTotals(previousFiltered);
    const prev2Totals = aggregateCategoryTotals(previous2Filtered);
    return [
      buildComparison(currentTotals, prevTotals, t("last-period")),
      buildComparison(currentTotals, prev2Totals, t("two-periods-ago")),
    ];
  }, [
    aggregateCategoryTotals,
    filtered,
    previousFiltered,
    previous2Filtered,
    t,
  ]);

  const openCategoryDetails = (categoryId: string) => {
    const relatedCategories = categories
      .filter((c) => c.id === categoryId || c.parent === categoryId)
      .map((c) => c.id);
    seeDetails({
      ...(focusType === "balance" ? {} : { type: focusType }),
      categories:
        relatedCategories.length > 0 ? relatedCategories : [categoryId],
    });
  };

  const [rankingPeriodIndex, setRankingPeriodIndex] = useState(0);
  const activeComparison = categoryComparisons[rankingPeriodIndex];
  const rankingItems = useMemo(() => {
    if (!activeComparison) return [];
    return [...activeComparison.topIncrease, ...activeComparison.topDecrease]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [activeComparison]);

  const [analysis, setAnalysis] = useState<AnalysisResult>();
  const analysisUnit =
    viewType === "yearly"
      ? "year"
      : viewType === "monthly"
        ? "month"
        : viewType === "weekly"
          ? "week"
          : "day";
  useEffect(() => {
    const book = useBookStore.getState().currentBookId;
    if (!book || !realRange[0] || !realRange[1]) {
      setAnalysis(undefined);
      return;
    }
    if (!analysisUnit) {
      setAnalysis(undefined);
      return;
    }
    runAnalysis(
      [realRange[0], realRange[1]],
      focusType,
      analysisUnit,
      (range) =>
        StorageDeferredAPI.filter(book, {
          ...effectiveFilter,
          start: range[0],
          end: range[1],
        }),
    ).then((v) => {
      setAnalysis(v);
    });
  }, [analysisUnit, effectiveFilter, focusType, realRange[0], realRange[1]]);

  const { updateFilter, addFilter } = useCustomFilters();
  const toChangeFilter = async () => {
    if (!selectedFilterView) {
      return;
    }
    const id = selectedFilterView.id;
    const action = await showBillFilterView({
      ...selectedFilterView,
      // hideDelete: id === DefaultFilterViewId,
    });
    if (action === "delete") {
      await updateFilter(id);
      setFilterViewId(allFilterViews[0].id);
      return;
    }
    await updateFilter(id, {
      ...action,
      name: action.name ?? selectedFilterView.name,
    });
  };
  const toReOrder = async () => {
    if ((customFilters?.length ?? 0) === 0) {
      return;
    }
    const ordered = await showSortableList(customFilters);
    useLedgerStore.getState().updateGlobalMeta((prev) => {
      prev.customFilters = ordered
        .map((v) => prev.customFilters?.find((c) => c.id === v.id))
        .filter((v) => v !== undefined);
      return prev;
    });
  };
  const toAddFilter = async () => {
    const newFilter = await showBillFilterView({
      name: t("new-filter-name"),
      filter: {},
      hideDelete: true,
    });
    if (newFilter === "delete" || !newFilter.name) {
      return;
    }
    const id = await addFilter(newFilter.name, newFilter);
    if (!id) {
      return;
    }
    setSliceId(undefined);
    setFilterViewId(id);
  };

  const { allCurrencies, baseCurrency } = useCurrency();
  const [showCloud, setShowCloud] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const assistantFilterView = useMemo(() => {
    if (!selectedFilterView) return undefined;
    return {
      ...selectedFilterView,
      filter: effectiveFilter,
    };
  }, [effectiveFilter, selectedFilterView]);

  const envArg = useMemo(
    () => ({
      filterView: assistantFilterView,
      focusType,
      viewType,
      range: realRange,
    }),
    [assistantFilterView, focusType, viewType, realRange],
  );
  return (
    <div className="w-full h-full p-2 flex flex-col items-center justify-center gap-4 overflow-hidden page-show">
      <div className="w-full mx-2 max-w-[600px] flex flex-col gap-2">
        <div className="w-full flex flex-col gap-2">
          <div className="w-full flex">
            <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hidden">
              {allFilterViews.map((filter) => {
                const displayCurrency =
                  filter.displayCurrency === baseCurrency.id
                    ? undefined
                    : allCurrencies.find(
                        (v) => v.id === filter.displayCurrency,
                      );
                return (
                  <Button
                    key={filter.id}
                    size={"sm"}
                    className={cn(
                      filterViewId !== filter.id
                        ? "text-primary/50"
                        : "relative after:absolute after:bottom-[2px] after:left-3 after:w-[calc(100%-24px)] after:h-[2px] after:rounded-full after:bg-primary/20",
                    )}
                    variant="ghost"
                    onClick={() => {
                      setSliceId(undefined);
                      setFilterViewId(filter.id);
                    }}
                  >
                    {displayCurrency?.symbol}
                    {filter.name}
                  </Button>
                );
              })}
            </div>
            <div className="">
              <Button variant="ghost" onClick={toAddFilter} size="sm">
                <i className="icon-[mdi--plus] size-4"></i>
              </Button>
              <Button variant="ghost" onClick={toReOrder} size="sm">
                <i className="icon-[mdi--menu] size-4"></i>
              </Button>
            </div>
          </div>
        </div>
        <DateSliced {...dateSlicedProps} onClickSettings={toChangeFilter}>
          <div className="flex items-center pr-2 relative">
            <Switch.Root
              checked={dimension === "user"}
              onCheckedChange={() => {
                setDimension((v) => {
                  return v === "category" ? "user" : "category";
                });
              }}
              className="relative z-[0] h-[29px] w-[54px] cursor-pointer rounded-sm bg-blackA6 outline-none bg-stone-300 group"
            >
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center gap-2 z-[1]">
                <i className="icon-[mdi--view-grid-outline] group-[data-[state=checked]]:text-white"></i>
                <i className="icon-[mdi--account-outline]"></i>
              </div>
              <Switch.Thumb className="block size-[22px] translate-x-[4px] rounded-sm bg-background transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[28px]" />
            </Switch.Root>
          </div>
        </DateSliced>
      </div>
      <FocusTypeSelector
        value={focusType}
        onValueChange={(v) => {
          setFocusType(v);
          setSelectedCategoryId(undefined);
        }}
        money={totalMoneys}
        previousMoney={previousTotalMoneys}
      />
      {analysis && (
        <QuickMetrics
          analysis={analysis}
          type={focusType}
          unit={analysisUnit}
        />
      )}
      <div className="w-full px-2 flex-1 flex justify-center overflow-y-auto">
        <div className="w-full max-w-[600px] flex flex-col items-center gap-4 relative">
          {dimension === "user" && (
            <div className="w-full rounded-md border p-2 flex flex-col gap-2">
              <div className="text-xs text-muted-foreground">{t("users")}</div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden">
                <Button
                  size="sm"
                  variant={creatorScope === "me" ? "default" : "outline"}
                  className="h-7 text-xs shrink-0"
                  onClick={() => setCreatorScope("me")}
                >
                  {t("only-me")}
                </Button>
                <Button
                  size="sm"
                  variant={creatorScope === "all" ? "default" : "outline"}
                  className="h-7 text-xs shrink-0"
                  onClick={() => setCreatorScope("all")}
                >
                  {t("all-members")}
                </Button>
                {creators
                  .filter(
                    (creator) => String(creator.id) !== String(currentUserId),
                  )
                  .map((creator) => (
                    <Button
                      key={creator.id}
                      size="sm"
                      variant={
                        creatorScope === String(creator.id)
                          ? "default"
                          : "outline"
                      }
                      className="h-7 text-xs shrink-0"
                      onClick={() => setCreatorScope(String(creator.id))}
                    >
                      {creator.name}
                    </Button>
                  ))}
              </div>
            </div>
          )}
          <Assistant env={envArg} />
          {Part}
          <div className="w-full rounded-md border p-2">
            <h2 className="font-medium text-lg mt-2 mb-1 text-center">
              {t("category-change-ranking")}
            </h2>
            <div className="flex justify-center gap-1 mb-2">
              {categoryComparisons.map((c, i) => (
                <Button
                  key={c.baselineLabel}
                  size="sm"
                  variant={rankingPeriodIndex === i ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setRankingPeriodIndex(i)}
                >
                  {t("compared-with", { period: c.baselineLabel })}
                </Button>
              ))}
            </div>
            {rankingItems.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {rankingItems.map((item) => {
                  const isPositive = item.delta > 0;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                      onClick={() => openCategoryDetails(item.id)}
                    >
                      <span className="text-sm">{item.name}</span>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          isPositive
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {amountToNumber(item.delta)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 flex items-center justify-center text-sm text-muted-foreground">
                {t("none")}
              </div>
            )}
          </div>
          {tagStructure.length > 0 && (
            <div className="rounded-md border p-2 w-full flex flex-col">
              <h2 className="font-medium text-lg my-3 text-center">
                {t("tag-details")}
              </h2>
              <div className="table w-full border-collapse">
                <div className="table-row-group divide-y">
                  {tagStructure.map((struct) => {
                    const index = FocusTypes.indexOf(focusType);
                    const money = [
                      struct.income,
                      struct.expense,
                      struct.income - struct.expense,
                    ][index];
                    const total = totalMoneys[index];
                    return (
                      <TagItem
                        key={struct.id}
                        name={struct.name}
                        money={money}
                        total={total}
                        type={focusType}
                        onClick={() => {
                          seeDetails({
                            tags: [struct.id],
                          });
                        }}
                      ></TagItem>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {[
            ...(topBills.expense ? [{ data: topBills.expense, label: t("expense") }] : []),
            ...(topBills.income ? [{ data: topBills.income, label: t("income") }] : []),
          ].map(({ data, label }) => (
            <div key={label} className="w-full rounded-md border p-2">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium text-base">
                  {t("top-bills")}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({label})
                  </span>
                </h2>
                <div className="flex gap-1">
                  {[10, 20, 30].map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={topPercent === p ? "default" : "outline"}
                      className="h-6 text-xs px-2"
                      onClick={() => setTopPercent(p)}
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
              </div>
              {data.top.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2 px-1">
                  {t("top-bills-summary", {
                    type: label,
                    percent: topPercent,
                    amount: amountToNumber(data.accumulated),
                    count: data.top.length,
                  })}
                </p>
              )}
              <div className="flex flex-col">
                {data.top.map((bill) => {
                  const pct =
                    data.totalAmount > 0
                      ? ((bill.amount / data.totalAmount) * 100).toFixed(1)
                      : "0";
                  return (
                    <div key={bill.id} className="flex items-center">
                      <BillItem
                        className="flex-1 min-w-0"
                        bill={bill}
                        showTime
                        onClick={() => showBillInfo(bill)}
                      />
                      <span className="text-xs text-muted-foreground shrink-0 pl-2">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="w-full rounded-md border p-2">
            <button
              type="button"
              className="w-full flex items-center justify-between"
              onClick={() => setShowCloud((v) => !v)}
            >
              <span className="font-medium">{t("analysis-cloud")}</span>
              <i
                className={cn(
                  showCloud
                    ? "icon-[mdi--chevron-up]"
                    : "icon-[mdi--chevron-down]",
                )}
              />
            </button>
            {showCloud && (
              <AnalysisCloud
                bills={
                  focusType === "expense"
                    ? filteredExpenseBills
                    : focusType === "income"
                      ? filteredIncomeBills
                      : filtered
                }
              />
            )}
          </div>
          <div className="w-full rounded-md border p-2">
            <button
              type="button"
              className="w-full flex items-center justify-between"
              onClick={() => setShowMap((v) => !v)}
            >
              <span className="font-medium">{t("analysis-map")}</span>
              <i
                className={cn(
                  showMap
                    ? "icon-[mdi--chevron-up]"
                    : "icon-[mdi--chevron-down]",
                )}
              />
            </button>
            {showMap && (
              <AnalysisMap
                bills={
                  focusType === "expense"
                    ? filteredExpenseBills
                    : focusType === "income"
                      ? filteredIncomeBills
                      : filtered
                }
              />
            )}
          </div>
          {analysis && (
            <div className="w-full rounded-md border p-2">
              <button
                type="button"
                className="w-full flex items-center justify-between"
                onClick={() => setShowAnalysis((v) => !v)}
              >
                <span className="font-medium">{t("analysis")}</span>
                <i
                  className={cn(
                    showAnalysis
                      ? "icon-[mdi--chevron-up]"
                      : "icon-[mdi--chevron-down]",
                  )}
                />
              </button>
              {showAnalysis && (
                <div className="pt-2">
                  <AnalysisDetail
                    analysis={analysis}
                    type={focusType}
                    unit={analysisUnit}
                  />
                </div>
              )}
            </div>
          )}
          <div>
            <Button variant="ghost" onClick={() => seeDetails()}>
              {t("see-all-ledgers")}
              <i className="icon-[mdi--arrow-up-right]"></i>
            </Button>
          </div>
          <div className="w-full h-20 flex-shrink-0"></div>
        </div>
      </div>
      <BillFilterViewProvider />
    </div>
  );
}
