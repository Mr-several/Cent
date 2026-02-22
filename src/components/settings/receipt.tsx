import { useShallow } from "zustand/shallow";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { usePreference } from "@/store/preference";
import { useUserStore } from "@/store/user";
import createConfirmProvider from "../confirm";
import { Button } from "../ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";

function Form({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const { id: userId } = useUserStore();

    // 获取AI配置信息
    const { configs = [], defaultConfigId } = useLedgerStore(
        useShallow((state) => {
            const assistantData =
                state.infos?.meta.personal?.[userId]?.assistant;
            return {
                configs: assistantData?.configs ?? [],
                defaultConfigId: assistantData?.defaultConfigId,
            };
        }),
    );

    // 判断是否有可用的AI配置
    const hasAIConfig = configs.length > 0 && defaultConfigId;

    // 识图记账开关状态
    const [receiptEnabled, setReceiptEnabled] = usePreference(
        "receiptRecognitionEnabled",
    );

    // 识图使用的 AI 配置 ID（空值表示使用默认）
    const [receiptAIConfigId, setReceiptAIConfigId] =
        usePreference("receiptAIConfigId");

    // 识别模式
    const [receiptMode, setReceiptMode] = usePreference(
        "receiptRecognitionMode",
    );

    // 当前选中的 AI 配置对象
    const selectedConfig = receiptAIConfigId
        ? configs.find((c) => c.id === receiptAIConfigId)
        : configs.find((c) => c.id === defaultConfigId);

    // 判断当前所选配置是否为视觉模型
    const isVisionModelSelected = Boolean(selectedConfig?.isVisionModel);

    const handleModeChange = (value: string) => {
        setReceiptMode(value as "ocr-ai" | "vision-ai");
    };

    const handleConfigChange = (value: string) => {
        setReceiptAIConfigId(value === "__default__" ? undefined : value);
        // 如果切换到非视觉模型，且当前模式是 vision-ai，则重置为 ocr-ai
        if (value !== "__default__") {
            const chosen = configs.find((c) => c.id === value);
            if (!chosen?.isVisionModel && receiptMode === "vision-ai") {
                setReceiptMode("ocr-ai");
            }
        }
    };

    return (
        <PopupLayout
            title={t("receipt-recognition-settings")}
            onBack={onCancel}
            className="h-full overflow-hidden"
        >
            <div className="flex-1 flex flex-col overflow-y-auto py-4">
                {/* 识图记账开关 */}
                <div className="w-full min-h-10 pb-2 flex justify-between items-center px-4 gap-2">
                    <div className="text-sm">
                        <div>{t("enable-receipt-recognition")}</div>
                        <div className="text-xs opacity-60">
                            {hasAIConfig
                                ? receiptEnabled
                                    ? t("receipt-recognition-tip")
                                    : t("receipt-recognition-description")
                                : t("receipt-recognition-requires-ai-config")}
                        </div>
                    </div>
                    <Switch
                        checked={Boolean(receiptEnabled && hasAIConfig)}
                        onCheckedChange={(checked) => {
                            if (hasAIConfig) {
                                setReceiptEnabled(checked);
                            }
                        }}
                        disabled={!hasAIConfig}
                    />
                </div>

                {/* 提示信息：未配置 AI */}
                {!hasAIConfig && (
                    <div className="px-4 py-2">
                        <div className="text-xs p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <div className="flex items-start gap-2">
                                <i className="icon-[mdi--information-outline] size-4 flex-shrink-0 mt-0.5" />
                                <div>{t("receipt-recognition-setup-tip")}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 以下配置仅在启用且有AI配置时显示 */}
                {receiptEnabled && hasAIConfig && (
                    <>
                        {/* AI 配置选择 */}
                        <div className="px-4 pt-4">
                            <div className="text-sm font-medium mb-1">
                                {t("receipt-ai-config")}
                            </div>
                            <div className="text-xs opacity-60 mb-2">
                                {t("receipt-ai-config-description")}
                            </div>
                            <Select
                                value={receiptAIConfigId ?? "__default__"}
                                onValueChange={handleConfigChange}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__default__">
                                        {t("receipt-ai-config-default")}
                                    </SelectItem>
                                    {configs.map((config) => (
                                        <SelectItem
                                            key={config.id}
                                            value={config.id}
                                        >
                                            <span className="flex items-center gap-1">
                                                {config.name}
                                                {config.isVisionModel && (
                                                    <span className="text-xs px-1 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
                                                        {t(
                                                            "ai-config-is-vision-model",
                                                        )}
                                                    </span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 识别模式选择 */}
                        <div className="px-4 pt-4">
                            <div className="text-sm font-medium mb-1">
                                {t("receipt-recognition-mode")}
                            </div>
                            <div className="text-xs opacity-60 mb-2">
                                {t("receipt-recognition-mode-description")}
                            </div>
                            <Select
                                value={receiptMode ?? "ocr-ai"}
                                onValueChange={handleModeChange}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ocr-ai">
                                        <div>
                                            <div>{t("receipt-mode-ocr-ai")}</div>
                                            <div className="text-xs opacity-60">
                                                {t(
                                                    "receipt-mode-ocr-ai-description",
                                                )}
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem
                                        value="vision-ai"
                                        disabled={!isVisionModelSelected}
                                    >
                                        <div>
                                            <div>
                                                {t("receipt-mode-vision-ai")}
                                            </div>
                                            <div className="text-xs opacity-60">
                                                {t(
                                                    "receipt-mode-vision-ai-description",
                                                )}
                                            </div>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {/* 当前配置非视觉模型时的提示 */}
                            {!isVisionModelSelected && (
                                <div className="text-xs opacity-60 mt-1 flex items-start gap-1">
                                    <i className="icon-[mdi--information-outline] size-3.5 flex-shrink-0 mt-0.5" />
                                    <span>
                                        {t("receipt-vision-requires-vision-model")}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 使用说明 */}
                        <div className="px-4 py-4">
                            <div className="text-xs p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                <div className="flex items-start gap-2">
                                    <i className="icon-[mdi--lightbulb-outline] size-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium mb-1">
                                            {t("receipt-recognition-how-to-use")}
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 opacity-80">
                                            <li>
                                                {t("receipt-recognition-step-1")}
                                            </li>
                                            <li>
                                                {t("receipt-recognition-step-2")}
                                            </li>
                                            <li>
                                                {t("receipt-recognition-step-3")}
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </PopupLayout>
    );
}

const [ReceiptSettingsProvider, showReceiptSettings] = createConfirmProvider(
    Form,
    {
        dialogTitle: "receipt-recognition-settings",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[70vh] sm:w-[90vw] sm:max-w-[500px]",
    },
);

export default function ReceiptSettingsItem() {
    const t = useIntl();
    const betaClassName = `relative after:content-['beta'] after:rounded after:bg-yellow-400 after:px-[2px] after:text-[8px] after:block after:absolute after:top-0 after:right-0 after:translate-x-[calc(100%+4px)]`;

    return (
        <div className="receipt-settings">
            <Button
                onClick={() => {
                    showReceiptSettings();
                }}
                variant="ghost"
                className="w-full py-4 rounded-none h-auto"
            >
                <div className="w-full px-4 flex justify-between items-center">
                    <div className={`${betaClassName} flex items-center gap-2`}>
                        <i className="icon-[mdi--image-text] size-5" />
                        {t("receipt-recognition-settings")}
                    </div>
                    <i className="icon-[mdi--chevron-right] size-5" />
                </div>
            </Button>
            <ReceiptSettingsProvider />
        </div>
    );
}
