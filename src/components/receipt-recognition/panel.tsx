import { useRef } from "react";
import { toast } from "sonner";
import { useIntl } from "@/locale";
import { useReceiptStore } from "@/store/receipt";
import { Button } from "../ui/button";
import { BatchConfirmation } from "./batch-confirmation";
import { useReceiptRecognition } from "./processor";
import type { ProcessingStatus } from "./processor";

interface ReceiptRecognitionPanelProps {
    onConfirm?: () => void;
    onCancel?: () => void;
}

function ProcessingProgress({ status }: { status: ProcessingStatus }) {
    const t = useIntl();

    if (!status) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <i className="icon-[mdi--loading] animate-spin text-lg" />
                <span>{t("receipt-processing")}</span>
            </div>
        );
    }

    const current = status.imageIndex + 1;
    const total = status.totalImages;

    const stages = {
        ocr: {
            icon: "icon-[mdi--text-recognition]",
            labelKey: "receipt-stage-ocr" as const,
            color: "text-blue-500",
        },
        ai: {
            icon: "icon-[mdi--robot-outline]",
            labelKey: "receipt-stage-ai" as const,
            color: "text-purple-500",
        },
        vision: {
            icon: "icon-[mdi--eye-outline]",
            labelKey: "receipt-stage-vision" as const,
            color: "text-emerald-500",
        },
    };

    const currentStage = stages[status.stage];
    const isOcrAiMode = status.stage === "ocr" || status.stage === "ai";

    return (
        <div className="w-full max-w-xs space-y-4">
            {/* 当前阶段 */}
            <div className="flex flex-col items-center gap-2">
                <div className={`text-4xl ${currentStage.color}`}>
                    <i className={`${currentStage.icon} animate-pulse`} />
                </div>
                <p className="text-sm font-medium">
                    {t(currentStage.labelKey, { index: current, total })}
                </p>
                <p className="text-xs text-muted-foreground">
                    {t("receipt-processing-image", { current, total })}
                </p>
            </div>

            {/* OCR+AI 模式下显示两步指示器 */}
            {isOcrAiMode && (
                <div className="flex items-center gap-2 justify-center">
                    <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                            status.stage === "ocr"
                                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-semibold"
                                : "bg-muted text-muted-foreground"
                        }`}
                    >
                        <i className="icon-[mdi--text-recognition] text-sm" />
                        <span>OCR</span>
                    </div>
                    <i className="icon-[mdi--chevron-right] text-muted-foreground" />
                    <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                            status.stage === "ai"
                                ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 font-semibold"
                                : "bg-muted text-muted-foreground"
                        }`}
                    >
                        <i className="icon-[mdi--robot-outline] text-sm" />
                        <span>AI</span>
                    </div>
                </div>
            )}

            {/* 进度条 */}
            <div className="w-full bg-muted rounded-full h-1.5">
                <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-500"
                    style={{
                        width: `${((status.imageIndex + (status.stage === "ai" ? 0.7 : status.stage === "vision" ? 0.5 : 0.3)) / total) * 100}%`,
                    }}
                />
            </div>
        </div>
    );
}

/**
 * Receipt Recognition Panel
 * Displays image upload interface or batch confirmation interface
 */
export function ReceiptRecognitionPanel({
    onConfirm,
    onCancel,
}: ReceiptRecognitionPanelProps) {
    const { currentSession } = useReceiptStore();
    const { isProcessing, processingStatus, startRecognition } = useReceiptRecognition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = useIntl();

    const handleFileSelect = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter((file) =>
            file.type.startsWith("image/"),
        );

        if (imageFiles.length === 0) {
            toast.error(t("receipt-invalid-file-type"));
            return;
        }

        await startRecognition(imageFiles);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // If there's an active session with candidates, show batch confirmation
    if (currentSession && currentSession.candidates.length > 0) {
        return (
            <div className="flex-1 overflow-hidden">
                <BatchConfirmation />
            </div>
        );
    }

    // Otherwise, show upload interface
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            {isProcessing ? (
                <div className="flex flex-col items-center space-y-6 py-4">
                    <ProcessingProgress status={processingStatus} />
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                        <i className="icon-[mdi--receipt-text-outline] text-5xl text-muted-foreground" />
                    </div>

                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-medium">
                            {t("receipt-upload-title")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t("receipt-upload-hint")}
                        </p>
                    </div>

                    <Button
                        onClick={handleUploadClick}
                        size="lg"
                        className="mt-4"
                    >
                        <i className="icon-[mdi--upload] mr-2" />
                        {t("receipt-upload-button")}
                    </Button>
                </div>
            )}

            {!isProcessing && (
                <div className="text-xs text-muted-foreground text-center max-w-md">
                    <p>{t("receipt-upload-description")}</p>
                </div>
            )}
        </div>
    );
}
