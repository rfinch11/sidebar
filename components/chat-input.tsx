"use client";

import { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, ChevronDown, X, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  selectedCategories: string[];
  onCategoriesChange: (cats: string[]) => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  selectedCategories,
  onCategoriesChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  const toggleCategory = (cat: string) => {
    onCategoriesChange(
      selectedCategories.includes(cat)
        ? selectedCategories.filter((c) => c !== cat)
        : [...selectedCategories, cat]
    );
  };

  const hasFilters = selectedCategories.length > 0;

  const filterLabel = hasFilters
    ? selectedCategories.length === 1
      ? CATEGORY_LABELS[selectedCategories[0] as Category]
      : `${selectedCategories.length} topics`
    : "All topics";

  return (
    <div className="flex flex-col rounded-xl border border-border/70 dark:border-white/10 bg-background shadow-xl focus-within:border-border dark:focus-within:border-white/50 p-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Start a sidebar..."
        className="min-h-[56px] max-h-[200px] resize-none border-0 !bg-transparent dark:!bg-transparent text-base !shadow-none focus-visible:ring-0"
        rows={1}
        autoFocus
        disabled={isLoading}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 sm:py-1 min-h-[44px] sm:min-h-0 text-xs transition-colors",
                  hasFilters
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <span>{filterLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <DropdownMenuItem
                    key={cat}
                    onSelect={(e) => {
                      e.preventDefault();
                      toggleCategory(cat);
                    }}
                    className="group flex items-center justify-between min-h-[44px] sm:min-h-0"
                  >
                    <span>{CATEGORY_LABELS[cat]}</span>
                    {isSelected && (
                      <>
                        <Check className="h-3.5 w-3.5 text-primary group-hover:hidden" />
                        <X className="h-3.5 w-3.5 text-muted-foreground hidden group-hover:block" />
                      </>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {hasFilters && (
            <button
              onClick={() => onCategoriesChange([])}
              className="flex items-center justify-center rounded-md p-1 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Clear filters"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <Button
          size="icon"
          className="h-10 w-10"
          onClick={onSubmit}
          disabled={!value.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
