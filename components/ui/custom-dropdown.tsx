"use client";

import { useMemo, useState, ReactNode } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
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
    searchable?: boolean;
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
    searchable = true,
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const selectedOption = options.find((option) => option.id === value);
    const shouldShowSearch = searchable && options.length > 6;
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return options;
        return options.filter((option) => (
            option.label.toLowerCase().includes(normalizedQuery) ||
            option.description?.toLowerCase().includes(normalizedQuery)
        ));
    }, [options, query]);

    const handleOpenChange = (open: boolean) => {
        if (disabled) return;
        setIsOpen(open);
        if (!open) setQuery("");
    };

    return (
        <div className={className}>
            <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
                <DropdownMenuTrigger asChild disabled={disabled}>
                    <button
                        type="button"
                        className={cn(
                            "flex h-10 w-full items-center gap-2 rounded-full border border-input bg-background/[0.65] px-4 text-foreground shadow-inner shadow-primary/5 transition-all duration-300 hover:bg-background/[0.85]",
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
                            className={cn("h-4 w-4 text-muted-foreground transition-transform", {
                                "transform rotate-180": isOpen,
                            })}
                        />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className={cn(
                        width,
                        "max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto rounded-2xl border-border/[0.70] bg-popover/[0.95] p-1.5 text-popover-foreground shadow-xl backdrop-blur-md",
                        contentClassName
                    )}
                    align="start"
                    sideOffset={6}
                >
                    {shouldShowSearch && (
                        <div className="sticky top-0 z-10 mb-1 rounded-xl bg-popover/[0.95] p-1 backdrop-blur">
                            <div className="flex h-9 items-center gap-2 rounded-xl border border-border/[0.70] bg-background/80 px-3">
                                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onKeyDown={(event) => event.stopPropagation()}
                                    placeholder="Search…"
                                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>
                    )}
                    {filteredOptions.map((option) => (
                        <DropdownMenuItem
                            key={option.id}
                            className={cn(
                                "flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5",
                                {
                                    "bg-primary/[0.12] text-primary": option.id === value,
                                    "hover:bg-muted/[0.55]": option.id !== value,
                                },
                                itemClassName
                            )}
                            onClick={() => onChange(option.id)}
                        >
                            {renderItem ? (
                                renderItem(option, option.id === value)
                            ) : (
                                <>
                                    <div className="min-w-0 flex flex-col">
                                        <span
                                            className={cn("truncate font-medium", {
                                                "text-primary": option.id === value,
                                                "text-foreground": option.id !== value,
                                            })}
                                        >
                                            {option.label}
                                        </span>
                                        {option.description && (
                                            <span className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {option.description}
                                            </span>
                                        )}
                                    </div>
                                    {option.id === value && <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />}
                                </>
                            )}
                        </DropdownMenuItem>
                    ))}
                    {filteredOptions.length === 0 && (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No matches
                        </div>
                    )}
                    {renderFooter && (
                        <div className="mt-1 border-t border-border/[0.70] pt-1">
                            {renderFooter()}
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
} 
