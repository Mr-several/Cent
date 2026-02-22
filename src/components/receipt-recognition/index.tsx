import { useRef } from "react";
import { toast } from "sonner";
import { useIntl } from "@/locale";
import { useReceiptStore } from "@/store/receipt";
import { Button } from "../ui/button";
import { BatchConfirmation } from "./batch-confirmation";
import { useReceiptRecognition } from "./processor";

/**
 * Receipt Recognition Entry Component
 * Handles image upload and initiates the recognition workflow
 */
export function ReceiptRecognition() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isProcessing, startRecognition } = useReceiptRecognition();
    const { currentSession } = useReceiptStore();
    const t = useIntl();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Convert FileList to Array
        const imageFiles = Array.from(files);

        // Validate file types
        const validFiles = imageFiles.filter((file) => {
            if (!file.type.startsWith("image/")) {
                toast.error(
                    t("receipt-invalid-file-type", { name: file.name }),
                );
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // Start recognition
        await startRecognition(validFiles);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
            />

            <Button
                onClick={handleButtonClick}
                disabled={isProcessing}
                className="w-full"
            >
                {isProcessing ? (
                    <>
                        <i className="icon-[mdi--loading] animate-spin mr-2" />
                        {t("receipt-processing")}
                    </>
                ) : (
                    <>
                        <i className="icon-[mdi--image-text] mr-2" />
                        {t("receipt-upload-image")}
                    </>
                )}
            </Button>

            {currentSession && <BatchConfirmation />}
        </>
    );
}
