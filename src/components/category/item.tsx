import type { MouseEventHandler } from "react";
import type { BillCategory } from "@/ledger/type";
import { cn } from "@/utils";
import CategoryIcon from "./icon";

export function CategoryItem({
    category,
    selected,
    onMouseDown,
    onClick,
    className,
    billType,
}: {
    category: BillCategory;
    selected?: boolean;
    onMouseDown?: MouseEventHandler<HTMLButtonElement>;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    className?: string;
    billType?: "expense" | "income";
}) {
    const selectedCn =
        billType === "income"
            ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/25"
            : "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/25";

    return (
        <button
            type="button"
            className={cn(
                "rounded-xl border-[1.5px] flex-1 py-2 px-2 min-h-[44px] flex items-center justify-center whitespace-nowrap cursor-pointer transition-all duration-150 active:scale-95",
                selected
                    ? selectedCn
                    : "bg-white text-stone-600 border-stone-200 shadow-sm hover:bg-stone-50 hover:border-stone-300 hover:shadow-md",
                className,
            )}
            onMouseDown={onMouseDown}
            onClick={onClick}
        >
            <CategoryIcon
                icon={category.icon}
                className="w-4 h-4 flex-shrink-0"
            />
            <div className="mx-1.5 truncate text-xs font-medium">{category.name}</div>
        </button>
    );
}
