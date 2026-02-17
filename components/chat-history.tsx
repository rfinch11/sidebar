"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronLeft, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ChatHistory({
  open,
  onOpenChange,
  activeChatId,
  onSelectChat,
  onNewChat,
}: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[80%] max-w-80 p-0 flex flex-col !gap-0 rounded-r-xl" showCloseButton={false}>
        <SheetHeader className="p-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] flex-row items-center justify-between">
          <SheetTitle>History</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <SheetDescription className="sr-only">
            Past conversations
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          <Button variant="outline" className="w-full" onClick={onNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4">
          {loading ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              Loading...
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectChat(conv.id)}
                className={cn(
                  "group w-full text-left px-3 py-2 rounded-md text-sm",
                  "transition-colors flex items-center",
                  conv.id === activeChatId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeDate(conv.updated_at)}
                  </p>
                </div>
                <div className="shrink-0 ml-2 items-center gap-0.5 hidden group-hover:flex">
                  <button
                    onClick={(e) => handleCopyId(e, conv.id)}
                    className={cn(
                      "p-1 rounded transition-all active:scale-[0.97]",
                      copiedId === conv.id
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {copiedId === conv.id ? (
                      <Check className="h-3.5 w-3.5 animate-in zoom-in-0 duration-150" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all active:scale-[0.97]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-border/50 text-[11px] text-muted-foreground/60">
          <p className="font-medium mb-1">Active models</p>
          <p>Claude Sonnet 4.5 · Claude Haiku 4.5 · Voyage 3</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
