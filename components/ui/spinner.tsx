import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
    className?: string;
    size?: "sm" | "md" | "lg" | number;
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
    let sizeInPixels: number;

    if (typeof size === 'number') {
        sizeInPixels = size;
    } else {
        switch (size) {
            case "sm":
                sizeInPixels = 16;
                break;
            case "lg":
                sizeInPixels = 32;
                break;
            case "md":
            default:
                sizeInPixels = 24;
                break;
        }
    }

    return (
        <Loader2
            className={cn("animate-spin text-green-500", className)}
            size={sizeInPixels}
        />
    );
} 