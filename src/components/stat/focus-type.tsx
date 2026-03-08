import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { toFixed } from "@/utils/number";
import Money from "../money";

export const FocusTypes = ["income", "expense", "balance"] as const;
export type FocusType = (typeof FocusTypes)[number];

function DeltaBadge({
    current,
    previous,
}: {
    current: number;
    previous: number;
}) {
    if (previous === 0) return null;
    const change = (current - previous) / Math.abs(previous);
    const percent = toFixed(Math.abs(change) * 100, 1);
    const isUp = change > 0;

    return (
        <div
            className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5",
                isUp
                    ? "text-semantic-expense/80 bg-semantic-expense/8"
                    : "text-semantic-income/80 bg-semantic-income/8",
            )}
        >
            <i
                className={cn(
                    "size-3",
                    isUp ? "icon-[mdi--arrow-up]" : "icon-[mdi--arrow-down]",
                )}
            />
            {percent}%
        </div>
    );
}

export function FocusTypeSelector({
    value: focusType,
    onValueChange: setFocusType,
    money,
    previousMoney,
}: {
    value: FocusType;
    onValueChange: (v: FocusType) => void;
    money: number[];
    previousMoney?: number[];
}) {
    const t = useIntl();

    const cards: {
        type: FocusType;
        label: string;
        sign: string;
        index: number;
        colorClass: string;
        activeClass: string;
    }[] = [
        {
            type: "income",
            label: t("income"),
            sign: "+",
            index: 0,
            colorClass: "text-semantic-income",
            activeClass: "border-semantic-income/30 bg-semantic-income/5",
        },
        {
            type: "expense",
            label: t("expense"),
            sign: "-",
            index: 1,
            colorClass: "text-semantic-expense",
            activeClass: "border-semantic-expense/30 bg-semantic-expense/5",
        },
        {
            type: "balance",
            label: t("Balance"),
            sign: "",
            index: 2,
            colorClass: "text-foreground",
            activeClass: "border-foreground/20 bg-foreground/5",
        },
    ];

    return (
        <div className="w-full max-w-[600px] grid grid-cols-3 gap-2 px-2">
            {cards.map((card) => {
                const isActive = focusType === card.type;
                return (
                    <button
                        key={card.type}
                        type="button"
                        className={cn(
                            "flex flex-col items-start gap-1 rounded-lg border p-3 cursor-pointer transition-all duration-200",
                            isActive
                                ? card.activeClass
                                : "border-border/50 hover:border-border",
                        )}
                        onClick={() => setFocusType(card.type)}
                    >
                        <div className="text-xs text-muted-foreground">
                            {card.label}
                        </div>
                        <div
                            className={cn(
                                "text-lg font-semibold leading-tight",
                                isActive && card.colorClass,
                            )}
                        >
                            {card.sign}
                            <Money value={money[card.index]} />
                        </div>
                        {previousMoney && (
                            <DeltaBadge
                                current={money[card.index]}
                                previous={previousMoney[card.index]}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
