import type { AnalysisResult } from "@/api/storage/analysis";
import { amountToNumber } from "@/ledger/bill";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import Money from "../money";
import type { FocusType } from "./focus-type";

export function QuickMetrics({
    analysis,
    type,
    unit,
}: {
    analysis: AnalysisResult;
    type: FocusType;
    unit: "week" | "month" | "year" | "day";
}) {
    const t = useIntl();

    const projectedLabel =
        unit === "week"
            ? t("metric.projected-week")
            : unit === "year"
              ? t("metric.projected-year")
              : t("metric.projected-month");

    const colorClass =
        type === "expense"
            ? "text-semantic-expense"
            : type === "income"
              ? "text-semantic-income"
              : "text-foreground";

    return (
        <div className="w-full max-w-[600px] px-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                    {t("metric.daily-avg")}{" "}
                    <span className={cn("font-medium", colorClass)}>
                        <Money
                            value={amountToNumber(analysis.current.dayAvg)}
                        />
                    </span>
                </span>
                <span className="text-border">·</span>
                <span>
                    {projectedLabel}{" "}
                    <span className={cn("font-medium", colorClass)}>
                        <Money
                            value={amountToNumber(analysis.projected.total)}
                        />
                    </span>
                </span>
            </div>
        </div>
    );
}
