"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, Pin, PinOff, Pencil, Trash2, MoreHorizontal, ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  pinned: boolean;
  pinned_at: string | null;
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

function ConversationItem({
  conv,
  isActive,
  renamingId,
  renameValue,
  onSelect,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameKeyDown,
  onPin,
  onDelete,
}: {
  conv: Conversation;
  isActive: boolean;
  renamingId: string | null;
  renameValue: string;
  onSelect: () => void;
  onRenameStart: (id: string, title: string) => void;
  onRenameChange: (val: string) => void;
  onRenameCommit: (id: string) => void;
  onRenameKeyDown: (e: React.KeyboardEvent, id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isRenaming = renamingId === conv.id;

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus();
  }, [isRenaming]);

  return (
    <div
      className={cn(
        "group w-full text-left px-3 py-2 rounded-md text-sm",
        "transition-colors flex items-center gap-2",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      )}
    >
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onSelect}>
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={() => onRenameCommit(conv.id)}
            onKeyDown={(e) => onRenameKeyDown(e, conv.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent outline-none font-medium text-sm truncate"
          />
        ) : (
          <p className="truncate text-sm text-muted-foreground">{conv.title}</p>
        )}
        {!isRenaming && (
          <p className="text-xs text-muted-foreground">
            {formatRelativeDate(conv.updated_at)}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "shrink-0 flex items-center justify-center rounded-md p-1 transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              "opacity-0 group-hover:opacity-100 focus:opacity-100",
              "sm:opacity-0 sm:group-hover:opacity-100",
              "opacity-100 sm:opacity-0" // always visible on mobile
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onSelect={() => onPin(conv.id, !conv.pinned)}
            className="min-h-[44px] sm:min-h-0"
          >
            {conv.pinned ? (
              <><PinOff className="h-4 w-4" /><span>Unpin</span></>
            ) : (
              <><Pin className="h-4 w-4" /><span>Pin</span></>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onRenameStart(conv.id, conv.title)}
            className="min-h-[44px] sm:min-h-0"
          >
            <Pencil className="h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => onDelete(conv.id)}
            className="min-h-[44px] sm:min-h-0"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [recentsOpen, setRecentsOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  const handlePin = async (id: string, pinned: boolean) => {
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, pinned, pinned_at: pinned ? new Date().toISOString() : null } : c)
    );
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
  };

  const handleRenameStart = (id: string, title: string) => {
    setRenamingId(id);
    setRenameValue(title);
  };

  const handleRenameCommit = async (id: string) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, title } : c)
    );
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") handleRenameCommit(id);
    if (e.key === "Escape") setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  };

  const pinned = conversations
    .filter((c) => c.pinned)
    .sort((a, b) => new Date(b.pinned_at!).getTime() - new Date(a.pinned_at!).getTime());

  const recents = conversations
    .filter((c) => !c.pinned)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const itemProps = (conv: Conversation) => ({
    conv,
    isActive: conv.id === activeChatId,
    renamingId,
    renameValue,
    onSelect: () => onSelectChat(conv.id),
    onRenameStart: handleRenameStart,
    onRenameChange: setRenameValue,
    onRenameCommit: handleRenameCommit,
    onRenameKeyDown: handleRenameKeyDown,
    onPin: handlePin,
    onDelete: handleDelete,
  });

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
            <p className="px-2 py-4 text-sm text-muted-foreground">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">No conversations yet</p>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => setPinnedOpen((v) => !v)}
                    className="flex items-center gap-1 w-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pin className="h-3 w-3" />
                    Pinned
                    <ChevronDown className={cn("h-3 w-3 transition-transform", !pinnedOpen && "-rotate-90")} />
                  </button>
                  {pinnedOpen && pinned.map((conv) => (
                    <ConversationItem key={conv.id} {...itemProps(conv)} />
                  ))}
                </div>
              )}
              {recents.length > 0 && (
                <div>
                  <button
                    onClick={() => setRecentsOpen((v) => !v)}
                    className="flex items-center gap-1 w-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Clock className="h-3 w-3" />
                    Recents
                    <ChevronDown className={cn("h-3 w-3 transition-transform", !recentsOpen && "-rotate-90")} />
                  </button>
                  {recentsOpen && recents.map((conv) => (
                    <ConversationItem key={conv.id} {...itemProps(conv)} />
                  ))}
                </div>
              )}
            </>
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
