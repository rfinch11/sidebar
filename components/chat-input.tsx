"use client";

import { useRef, useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sourceCount, setSourceCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    fetch("/api/sources/count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSourceCount(data.count);
      })
      .catch(() => {});
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

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
        disabled={isLoading}
      />
      <div className="flex items-center justify-between">
        {sourceCount !== null ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-600 pl-1 tabular-nums">
            {sourceCount} available {sourceCount === 1 ? "source" : "sources"}
          </span>
        ) : (
          <span />
        )}
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
