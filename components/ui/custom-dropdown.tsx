"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DropdownOption = {
    id: string;
    label: string;
    description?: string;
    icon?: ReactNode;
};

interface CustomDropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    width?: string;
    className?: string;
    buttonClassName?: string;
    contentClassName?: string;
    itemClassName?: string;
    renderItem?: (option: DropdownOption, isSelected: boolean) => ReactNode;
    renderFooter?: () => ReactNode;
    disabled?: boolean;
}

export function CustomDropdown({
    options,
    value,
    onChange,
    placeholder = "Select...",
    width = "w-[240px]",
    className = "",
    buttonClassName = "",
    contentClassName = "",
    itemClassName = "",
    renderItem,
    renderFooter,
    disabled = false,
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((option) => option.id === value);

    return (
        <div className={className}>
            <DropdownMenu open={isOpen} onOpenChange={disabled ? undefined : setIsOpen}>
                <DropdownMenuTrigger asChild disabled={disabled}>
                    <button
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-700 transition-all duration-200 hover:bg-gray-700/80 hover:border-gray-600 text-white w-full",
                            {
                                "opacity-50 cursor-not-allowed": disabled,
                            },
                            buttonClassName
                        )}
                    >
                        <span className="font-medium truncate flex-1 text-left">
                            {selectedOption?.label || placeholder}
                        </span>
                        <ChevronDown
                            className={cn("h-4 w-4 text-gray-400 transition-transform", {
                                "transform rotate-180": isOpen,
                            })}
                        />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className={cn(
                        width,
                        "bg-gray-800/95 backdrop-blur-md rounded-xl border-gray-700 text-white",
                        contentClassName
                    )}
                    align="start"
                >
                    {options.map((option) => (
                        <DropdownMenuItem
                            key={option.id}
                            className={cn(
                                "py-2.5 cursor-pointer  rounded-xl flex justify-between items-center",
                                {
                                    "border-l-green-500 bg-green-900/20": option.id === value,
                                    "border-l-transparent hover:border-l-gray-300": option.id !== value,
                                },
                                itemClassName
                            )}
                            onClick={() => onChange(option.id)}
                        >
                            {renderItem ? (
                                renderItem(option, option.id === value)
                            ) : (
                                <>
                                    <div className="flex flex-col">
                                        <span
                                            className={cn("font-medium", {
                                                "text-green-400": option.id === value,
                                                "text-white": option.id !== value,
                                            })}
                                        >
                                            {option.label}
                                        </span>
                                        {option.description && (
                                            <span className="text-xs text-gray-400 mt-0.5">
                                                {option.description}
                                            </span>
                                        )}
                                    </div>
                                    {option.id === value && <Check className="h-4 w-4 text-green-400" />}
                                </>
                            )}
                        </DropdownMenuItem>
                    ))}
                    {renderFooter && (
                        <div className="border-t border-gray-700 pt-1 mt-1">
                            {renderFooter()}
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
} 