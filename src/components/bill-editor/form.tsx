import { Switch } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useCategory from "@/hooks/use-category";
import { useCurrency } from "@/hooks/use-currency";
import { useTag } from "@/hooks/use-tag";
import PopupLayout from "@/layouts/popup-layout";
import { amountToNumber, numberToAmount } from "@/ledger/bill";
import { ExpenseBillCategories, IncomeBillCategories } from "@/ledger/category";
import type { Bill } from "@/ledger/type";
import { categoriesGridClassName } from "@/ledger/utils";
import { useIntl, useLocale } from "@/locale";
import type { EditBill } from "@/store/ledger";
import { usePreference, usePreferenceStore } from "@/store/preference";
import { cn } from "@/utils";
import { getPredictNow } from "@/utils/predict";
import { showTagList } from "../bill-tag";
import { showCategoryList } from "../category";
import { CategoryItem } from "../category/item";
import { DatePicker } from "../date-picker";
import Deletable from "../deletable";
import { FORMAT_IMAGE_SUPPORTED, showFilePicker } from "../file-picker";
import SmartImage from "../image";
import IOSUnscrolledInput from "../input";
import Calculator from "../keyboard";
import { ReceiptRecognitionPanel } from "../receipt-recognition/panel";
import CurrentLocation from "../simple-location";
import Tag from "../tag";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { goAddBill } from ".";
import { RemarkHint } from "./remark";
import TagGroupSelector from "./tag-group";

const defaultBill = {
    type: "expense" as Bill["type"],
    comment: "",
    amount: 0,
    categoryId: ExpenseBillCategories[0].id,
};

export default function EditorForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: EditBill;
    onConfirm?: (v: Omit<Bill, "id" | "creatorId">) => void;
    onCancel?: () => void;
}) {
    const t = useIntl();
    const goBack = () => {
        onCancel?.();
    };

    const { baseCurrency, convert, quickCurrencies, allCurrencies } =
        useCurrency();

    const { incomes, expenses, categories: allCategories } = useCategory();

    const isCreate = edit === undefined;
    const [receiptEnabled] = usePreference("receiptRecognitionEnabled");
    const [activeTab, setActiveTab] = useState<"manual" | "receipt">("manual");

    // Only show tabs when creating a new bill and receipt recognition is enabled
    const showTabs = isCreate && receiptEnabled;

    const predictCategory = useMemo(() => {
        // 只有新增账单时才展示预测
        if (!isCreate) {
            return;
        }
        const predict = getPredictNow();
        const pc = predict?.category?.[0];
        if (!pc) {
            return;
        }
        const category = allCategories.find((v) => v.id === pc);
        return category;
    }, [isCreate, allCategories]);

    const predictComments = useMemo(() => {
        // 只有新增账单时才展示预测
        if (!isCreate) {
            return;
        }
        const predict = getPredictNow();
        const pc = predict?.comment;
        return pc;
    }, [isCreate]);

    const [billState, setBillState] = useState(() => {
        const init = {
            ...defaultBill,
            categoryId: predictCategory?.id ?? defaultBill.categoryId,
            time: Date.now(),
            ...edit,
        };
        if (edit?.currency?.target === baseCurrency.id) {
            delete init.currency;
        }
        return init;
    });

    const { grouped } = useTag();

    const categories = billState.type === "expense" ? expenses : incomes;

    const subCategories = useMemo(() => {
        const selected = categories.find(
            (c) =>
                c.id === billState.categoryId ||
                c.children.some((s) => s.id === billState.categoryId),
        );
        if (selected?.children) {
            return selected.children;
        }
        return categories.find((c) => c.id === selected?.parent)?.children;
    }, [billState.categoryId, categories]);

    const toConfirm = useCallback(() => {
        onConfirm?.({
            ...billState,
        });
    }, [onConfirm, billState]);

    const chooseImage = async () => {
        const [file] = await showFilePicker({ accept: FORMAT_IMAGE_SUPPORTED });
        setBillState((v) => {
            return { ...v, images: [...(v.images ?? []), file] };
        });
    };

    const locationRef = useRef<HTMLButtonElement>(null);
    const isAdd = useRef(!edit);
    useEffect(() => {
        if (
            !isAdd.current ||
            !usePreferenceStore.getState().autoLocateWhenAddBill
        ) {
            return;
        }
        locationRef.current?.click?.();
    }, []);

    const monitorRef = useRef<HTMLButtonElement>(null);
    const [monitorFocused, setMonitorFocused] = useState(false);
    useEffect(() => {
        monitorRef.current?.focus?.();
    }, []);

    useEffect(() => {
        if (monitorFocused) {
            const onPress = (event: KeyboardEvent) => {
                const key = event.key;
                if (key === "Enter") {
                    toConfirm();
                }
            };
            document.addEventListener("keypress", onPress);
            return () => {
                document.removeEventListener("keypress", onPress);
            };
        }
    }, [monitorFocused, toConfirm]);

    const targetCurrency =
        allCurrencies.find(
            (c) => c.id === (billState.currency?.target ?? baseCurrency.id),
        ) ?? baseCurrency;

    const changeCurrency = (newCurrencyId: string) =>
        setBillState((prev) => {
            if (newCurrencyId === baseCurrency.id) {
                return {
                    ...prev,
                    amount: prev.currency?.amount ?? prev.amount,
                    currency: undefined,
                };
            }
            const { predict } = convert(
                amountToNumber(prev.currency?.amount ?? prev.amount),
                newCurrencyId,
                baseCurrency.id,
                prev.time,
            );
            return {
                ...prev,
                amount: numberToAmount(predict),
                currency: {
                    base: baseCurrency.id,
                    target: newCurrencyId,
                    amount: prev.currency?.amount ?? prev.amount,
                },
            };
        });

    const calculatorInitialValue = billState?.currency
        ? amountToNumber(billState.currency.amount)
        : billState?.amount
          ? amountToNumber(billState?.amount)
          : 0;

    const multiplyKey = usePreferenceStore((v) => {
        if (!v.multiplyKey || v.multiplyKey === "off") {
            return undefined;
        }
        if (v.multiplyKey === "double-zero") {
            return "double-zero";
        }
        return "triple-zero";
    });
    return (
        <Calculator.Root
            multiplyKey={multiplyKey}
            initialValue={calculatorInitialValue}
            onValueChange={(n) => {
                setBillState((v) => {
                    if (v.currency) {
                        const { predict } = convert(
                            n,
                            v.currency.target,
                            v.currency.base,
                            v.time,
                        );
                        return {
                            ...v,
                            amount: numberToAmount(predict),
                            currency: {
                                ...v.currency,
                                amount: numberToAmount(n),
                            },
                        };
                    }
                    return {
                        ...v,
                        amount: numberToAmount(n),
                    };
                });
            }}
            input={monitorFocused}
        >
            <PopupLayout
                className="h-full gap-2 pb-0 overflow-y-auto scrollbar-hidden"
                onBack={goBack}
                title={
                    showTabs ? (
                        <div className="pl-[54px] w-full min-h-12 rounded-lg flex pt-2 pb-0 overflow-hidden scrollbar-hidden">
                            <Tabs
                                value={activeTab}
                                onValueChange={(v) =>
                                    setActiveTab(v as "manual" | "receipt")
                                }
                                className="w-full"
                            >
                                <TabsList className="w-full grid grid-cols-2 h-10">
                                    <TabsTrigger
                                        value="manual"
                                        className="text-sm"
                                    >
                                        {t("manual-entry")}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="receipt"
                                        className="text-sm"
                                    >
                                        {t("receipt-recognition")}
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="pl-[54px] w-full min-h-12 rounded-lg flex pt-2 pb-0 overflow-hidden scrollbar-hidden">
                            <div className="text-white">
                                <Switch.Root
                                    className="w-24 h-12 relative bg-stone-900 rounded-lg p-1 flex justify-center items-center"
                                    checked={billState.type === "income"}
                                    onCheckedChange={() => {
                                        setBillState((v) => ({
                                            ...v,
                                            type:
                                                v.type === "expense"
                                                    ? "income"
                                                    : "expense",
                                            categoryId:
                                                v.type === "expense"
                                                    ? IncomeBillCategories[0].id
                                                    : ExpenseBillCategories[0]
                                                          .id,
                                        }));
                                    }}
                                >
                                    <Switch.Thumb className="w-1/2 h-full flex justify-center items-center transition-all rounded-md bg-semantic-expense -translate-x-[22px] data-[state=checked]:bg-semantic-income data-[state=checked]:translate-x-[21px]">
                                        <span className="text-[8px]">
                                            {billState.type === "expense"
                                                ? t("expense")
                                                : t("income")}
                                        </span>
                                    </Switch.Thumb>
                                </Switch.Root>
                            </div>
                            <div className="flex-1 flex bg-stone-400 focus:outline rounded-lg ml-2 px-2 relative">
                                {quickCurrencies.length > 0 && (
                                    <Select
                                        value={targetCurrency?.id}
                                        onValueChange={(newCurrencyId) => {
                                            changeCurrency(newCurrencyId);
                                        }}
                                    >
                                        <div className="flex items-center">
                                            <SelectTrigger className="w-fit outline-none ring-none border-none shadow-none p-0 [&_svg]:hidden">
                                                <div className="flex items-center font-semibold text-2xl text-white">
                                                    {targetCurrency?.symbol}
                                                </div>
                                            </SelectTrigger>
                                        </div>
                                        <SelectContent>
                                            {quickCurrencies.map((currency) => (
                                                <SelectItem
                                                    key={currency.id}
                                                    value={currency.id}
                                                >
                                                    {currency.label}
                                                    {`(${currency.symbol})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <button
                                    ref={monitorRef}
                                    type="button"
                                    onFocus={() => {
                                        setMonitorFocused(true);
                                    }}
                                    onBlur={() => {
                                        setMonitorFocused(false);
                                    }}
                                    className="flex-1 flex flex-col justify-center items-end overflow-x-scroll outline-none"
                                >
                                    {billState.currency && (
                                        <div className="absolute text-white text-[8px] top-0">
                                            ≈ {baseCurrency.symbol}{" "}
                                            {amountToNumber(billState.amount)}{" "}
                                            {baseCurrency.label}
                                        </div>
                                    )}
                                    <Calculator.Value
                                        className={cn(
                                            "text-white text-3xl font-semibold text-right bg-transparent after:inline-block after:content-['|'] after:opacity-0 after:font-thin after:translate-y-[-3px] ",
                                            monitorFocused &&
                                                "after:animate-caret-blink",
                                        )}
                                    ></Calculator.Value>
                                    {billState.amount < 0 && (
                                        <div className="absolute text-red-700 text-[8px] bottom-0">
                                            {t("bill-negative-tip")}
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    )
                }
            >
                {showTabs && activeTab === "receipt" ? (
                    <ReceiptRecognitionPanel
                        onConfirm={() => {
                            goBack();
                        }}
                        onCancel={onCancel}
                    />
                ) : (
                    <>
                        {/* 金额显示条 — 仅 showTabs 模式下显示，补充缺失的金额反馈 */}
                        {showTabs && (
                            <div className={cn(
                                "mx-2 flex items-center gap-3 rounded-2xl px-4 py-3 flex-shrink-0 transition-colors duration-300",
                                billState.type === "income"
                                    ? "bg-emerald-950"
                                    : "bg-stone-900",
                            )}>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    {(["expense", "income"] as const).map((tp) => (
                                        <button
                                            key={tp}
                                            type="button"
                                            onClick={() =>
                                                setBillState((v) => ({
                                                    ...v,
                                                    type: tp,
                                                    categoryId:
                                                        tp === "expense"
                                                            ? ExpenseBillCategories[0].id
                                                            : IncomeBillCategories[0].id,
                                                }))
                                            }
                                            className={cn(
                                                "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer active:scale-95",
                                                billState.type === tp
                                                    ? tp === "expense"
                                                        ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30"
                                                        : "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/30"
                                                    : "bg-white/8 text-white/35 border-white/10 hover:bg-white/15 hover:text-white/60",
                                            )}
                                        >
                                            {t(tp)}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    ref={monitorRef}
                                    type="button"
                                    onFocus={() => setMonitorFocused(true)}
                                    onBlur={() => setMonitorFocused(false)}
                                    className="flex-1 flex justify-end items-center outline-none min-h-[44px]"
                                >
                                    <Calculator.Value
                                        className={cn(
                                            "text-white text-3xl font-bold text-right tracking-tight",
                                            "after:inline-block after:content-['|'] after:opacity-0 after:font-thin after:translate-y-[-3px]",
                                            monitorFocused && "after:animate-caret-blink",
                                        )}
                                    />
                                </button>
                            </div>
                        )}

                        {/* categories */}
                        <div className="flex-shrink-0 overflow-y-auto scrollbar-hidden flex flex-col mx-2 gap-2 text-sm font-medium">
                            <div className="flex flex-col shrink-0 overflow-y-auto scrollbar-hidden w-full">
                                <div
                                    className={cn(
                                        "grid gap-1.5",
                                        categoriesGridClassName(categories),
                                    )}
                                >
                                    {categories.map((item) => (
                                        <CategoryItem
                                            key={item.id}
                                            category={item}
                                            billType={billState.type}
                                            selected={
                                                billState.categoryId === item.id
                                            }
                                            onMouseDown={() => {
                                                setBillState((v) => ({
                                                    ...v,
                                                    categoryId: item.id,
                                                }));
                                            }}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        className="rounded-xl border-[1.5px] border-dashed border-stone-300 flex-1 py-2 px-2 min-h-[44px] flex gap-1.5 items-center justify-center whitespace-nowrap cursor-pointer text-stone-400 bg-white hover:bg-stone-50 hover:border-stone-400 transition-all duration-150 active:scale-95 text-xs font-medium"
                                        onClick={() => {
                                            showCategoryList(billState.type);
                                        }}
                                    >
                                        <i className="icon-[mdi--tune-variant] text-base"></i>
                                        {t("edit")}
                                    </button>
                                </div>
                            </div>
                            {(subCategories?.length ?? 0) > 0 && (
                                <div className="flex flex-col shrink-0 max-h-fit overflow-y-auto rounded-xl bg-stone-100/80 p-2 scrollbar-hidden">
                                    <div
                                        className={cn(
                                            "grid gap-1.5",
                                            categoriesGridClassName(
                                                subCategories,
                                            ),
                                        )}
                                    >
                                        {subCategories?.map((subCategory) => {
                                            return (
                                                <CategoryItem
                                                    key={subCategory.id}
                                                    category={subCategory}
                                                    billType={billState.type}
                                                    selected={
                                                        billState.categoryId ===
                                                        subCategory.id
                                                    }
                                                    onMouseDown={() => {
                                                        setBillState((v) => ({
                                                            ...v,
                                                            categoryId:
                                                                subCategory.id,
                                                        }));
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* tags */}
                        <div className="w-full h-10 flex-shrink-0 flex-grow-0 flex gap-1.5 py-1 items-center overflow-x-auto px-2 text-sm font-medium scrollbar-hidden">
                            <TagGroupSelector
                                isCreate={isCreate}
                                selectedTags={billState.tagIds}
                                onSelectChange={(newTagIds, extra) => {
                                    setBillState((prev) => ({
                                        ...prev,
                                        tagIds: newTagIds,
                                    }));
                                    if (extra?.preferCurrency) {
                                        changeCurrency(extra.preferCurrency);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="rounded-full border border-stone-200 py-1 px-2.5 h-7 flex gap-1 items-center justify-center whitespace-nowrap cursor-pointer text-stone-400 text-xs hover:bg-stone-50 hover:border-stone-300 transition-colors duration-150 flex-shrink-0"
                                onClick={() => {
                                    showTagList();
                                }}
                            >
                                <i className="icon-[mdi--tag-text-outline] text-sm"></i>
                                {t("edit-tags")}
                            </button>
                        </div>

                        {/* keyboard area */}
                        <div
                            className={cn(
                                "h-[calc(480px+160px*(var(--bekh,0.5)-0.5))] sm:h-[calc(380px+160px*(var(--bekh,0.5)-0.5))] min-h-[264px] max-h-[calc(100%-124px)]",
                                "keyboard-field flex gap-2 flex-col justify-start bg-stone-900 sm:rounded-b-md text-[white] p-2 pb-[max(env(safe-area-inset-bottom),8px)]",
                            )}
                        >
                            {/* 工具栏 */}
                            <div className="flex items-center gap-1 h-11">
                                {/* 左侧工具组 */}
                                <div className="flex items-center gap-1">
                                    {/* 图片 */}
                                    <div className="flex items-center">
                                        {(billState.images?.length ?? 0) > 0 && (
                                            <div className="pr-1 flex gap-1 items-center overflow-x-auto max-w-20 h-full scrollbar-hidden">
                                                {billState.images?.map((img, index) => (
                                                    <Deletable
                                                        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                                                        key={index}
                                                        onDelete={() => {
                                                            setBillState((v) => ({
                                                                ...v,
                                                                images: v.images?.filter((m) => m !== img),
                                                            }));
                                                        }}
                                                    >
                                                        <SmartImage
                                                            source={img}
                                                            alt=""
                                                            className="w-7 h-7 object-cover rounded-md"
                                                        />
                                                    </Deletable>
                                                ))}
                                            </div>
                                        )}
                                        {(billState.images?.length ?? 0) < 3 && (
                                            <button
                                                type="button"
                                                className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                                onClick={chooseImage}
                                            >
                                                <i className="icon-[mdi--image-plus-outline] text-white text-lg" />
                                                <span className="text-[10px] text-white/60">{t("photo")}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* 位置 */}
                                    <div className="flex items-center">
                                        {billState?.location ? (
                                            <Deletable
                                                onDelete={() => {
                                                    setBillState((prev) => ({
                                                        ...prev,
                                                        location: undefined,
                                                    }));
                                                }}
                                            >
                                                <div className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px]">
                                                    <i className="icon-[mdi--location-radius] text-white text-lg" />
                                                    <span className="text-[10px] text-white/60">{t("location")}</span>
                                                </div>
                                            </Deletable>
                                        ) : (
                                            <CurrentLocation
                                                ref={locationRef}
                                                className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                                onValueChange={(v) => {
                                                    setBillState((prev) => ({
                                                        ...prev,
                                                        location: v,
                                                    }));
                                                }}
                                            >
                                                <i className="icon-[mdi--add-location] text-white text-lg" />
                                                <span className="text-[10px] text-white/60">{t("location")}</span>
                                            </CurrentLocation>
                                        )}
                                    </div>

                                    {/* 时间 */}
                                    <div className="rounded-lg hover:bg-white/10 transition-colors">
                                        <DatePicker
                                            fixedTime
                                            value={billState.time}
                                            onChange={(time) => {
                                                setBillState((prev) => {
                                                    if (!prev.currency) {
                                                        return { ...prev, time };
                                                    }
                                                    const { predict } = convert(
                                                        amountToNumber(prev.currency?.amount ?? prev.amount),
                                                        prev.currency.target,
                                                        baseCurrency.id,
                                                        time,
                                                    );
                                                    return {
                                                        ...prev,
                                                        time,
                                                        amount: numberToAmount(predict),
                                                        currency: {
                                                            base: baseCurrency.id,
                                                            target: prev.currency.target,
                                                            amount: prev.currency?.amount ?? prev.amount,
                                                        },
                                                    };
                                                });
                                            }}
                                        >
                                            <i className="icon-[mdi--calendar-clock] text-white/80 text-base mr-0.5" />
                                        </DatePicker>
                                    </div>
                                </div>

                                {/* 右侧备注输入 */}
                                <RemarkHint
                                    recommends={predictComments}
                                    onSelect={(v) => {
                                        setBillState((prev) => ({
                                            ...prev,
                                            comment: `${prev.comment} ${v}`,
                                        }));
                                    }}
                                >
                                    <div className="flex flex-1 h-11 items-center">
                                        <IOSUnscrolledInput
                                            value={billState.comment}
                                            onChange={(e) => {
                                                setBillState((v) => ({
                                                    ...v,
                                                    comment: e.target.value,
                                                }));
                                            }}
                                            type="text"
                                            className="w-full bg-transparent text-white text-right placeholder-opacity-50 outline-none text-sm"
                                            placeholder={t("comment")}
                                            enterKeyHint="done"
                                        />
                                    </div>
                                </RemarkHint>
                            </div>

                            {/* 确认按钮 */}
                            <button
                                type="button"
                                className="flex h-14 justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-2xl font-bold text-base cursor-pointer transition-all duration-150 shadow-lg shadow-emerald-900/40 active:scale-[0.98]"
                                onClick={toConfirm}
                            >
                                <i className="icon-[mdi--check-circle-outline] text-xl" />
                                <span>{t("confirm")}</span>
                            </button>
                            <Calculator.Keyboard
                                className={cn("flex-1")}
                                onKey={(v) => {
                                    if (v === "r") {
                                        toConfirm();
                                        setTimeout(() => {
                                            goAddBill();
                                        }, 10);
                                    }
                                }}
                            />
                        </div>
                    </>
                )}
            </PopupLayout>
        </Calculator.Root>
    );
}
