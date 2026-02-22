import { useRef, useState } from "react";
import { toast } from "sonner";
import { useIntl } from "@/locale";
import { useReceiptStore } from "@/store/receipt";
import { Button } from "../ui/button";
import { BatchConfirmation } from "./batch-confirmation";
import { useReceiptRecognition } from "./processor";

interface ReceiptRecognitionPanelProps {
    onConfirm?: () => void;
    onCancel?: () => void;
}

/**
 * Receipt Recognition Panel
 * Displays image upload interface or batch confirmation interface
 */
export function ReceiptRecognitionPanel({
    onConfirm,
    onCancel,
}: ReceiptRecognitionPanelProps) {
    const { currentSession, clearSession } = useReceiptStore();
    const { isProcessing, startRecognition } = useReceiptRecognition();
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
                    disabled={isProcessing}
                    size="lg"
                    className="mt-4"
                >
                    {isProcessing ? (
                        <>
                            <i className="icon-[mdi--loading] animate-spin mr-2" />
                            {t("receipt-processing")}
                        </>
                    ) : (
                        <>
                            <i className="icon-[mdi--upload] mr-2" />
                            {t("receipt-upload-button")}
                        </>
                    )}
                </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center max-w-md">
                <p>{t("receipt-upload-description")}</p>
            </div>
        </div>
    );
}
