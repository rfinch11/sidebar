"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ChatHistory } from "@/components/chat-history";
import { createClient } from "@/lib/supabase/client";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/profile-menu";

function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

function getInitialChatId(): string {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("activeChatId") ?? crypto.randomUUID();
  }
  return crypto.randomUUID();
}

export default function Home() {
  const [activeChatId, setActiveChatId] = useState(getInitialChatId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("activeChatId");
    }
    return null;
  });
  const [userInitials, setUserInitials] = useState("");

  const { messages, sendMessage, setMessages, status } = useChat({
    id: activeChatId,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const isLoading = status === "submitted" || status === "streaming";

  // Persist activeChatId to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("activeChatId", activeChatId);
  }, [activeChatId]);

  // Fetch user initials via auth state listener (fires once session is ready)
  useEffect(() => {
    const supabase = createClient();

    const setInitialsFromUser = (user: { user_metadata?: Record<string, string>; email?: string }) => {
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        "";
      const parts = name.trim().split(/\s+/);
      setUserInitials(
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase()
      );
    };

    // Try immediately
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setInitialsFromUser(user);
    });

    // Also listen for session changes (catches late-loading sessions)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setInitialsFromUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load conversation messages when pendingLoadId changes
  useEffect(() => {
    if (!pendingLoadId) return;
    let cancelled = false;

    fetch(`/api/conversations/${pendingLoadId}`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && !cancelled && data.messages?.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPendingLoadId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pendingLoadId, setMessages]);

  // Track whether the user can see the bottom sentinel
  useEffect(() => {
    const sentinel = bottomRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtBottom(entry.isIntersecting);
        if (entry.isIntersecting) setStepIndex(-1);
      },
      { root: scrollRef.current, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const [stepIndex, setStepIndex] = useState(-1);

  const getUserMessageElements = () =>
    Array.from(scrollRef.current?.querySelectorAll<HTMLElement>("[data-user-msg]") ?? []);

  const scrollToBottom = () => {
    setStepIndex(-1);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const stepUp = () => {
    const els = getUserMessageElements();
    if (els.length === 0) return;
    // If we haven't started stepping, start from the last user message
    if (stepIndex < 0) {
      const idx = els.length - 1;
      setStepIndex(idx);
      els[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (stepIndex > 0) {
      const idx = stepIndex - 1;
      setStepIndex(idx);
      els[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const stepDown = () => {
    const els = getUserMessageElements();
    if (els.length === 0 || stepIndex < 0) {
      scrollToBottom();
      return;
    }
    if (stepIndex < els.length - 1) {
      const idx = stepIndex + 1;
      setStepIndex(idx);
      els[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Already at last user message, scroll to bottom
      setStepIndex(-1);
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  const onSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  const onSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setPendingLoadId(id);
    setSidebarOpen(false);
  }, []);

  const onNewChat = useCallback(() => {
    setActiveChatId(crypto.randomUUID());
    setSidebarOpen(false);
  }, []);

  return (
    <div className="relative flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setSidebarOpen(true)}
          >
            <Logo size={20} />
          </Button>
          <h1 className="text-lg font-semibold">Sidebar</h1>
        </div>
        <ProfileMenu initials={userInitials} />
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[60dvh] flex-col items-center justify-center text-center">
              <div className="mb-4 flex items-center gap-2">
                <Logo size={40} />
                <h1 className="text-xl font-semibold">Sidebar</h1>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Your personal AI advisor
              </p>
            </div>
          ) : (
            <div className="py-4 pb-32">
              {messages.map((message, i) => (
                <ChatMessage
                  key={message.id}
                  role={message.role as "user" | "assistant"}
                  content={getMessageText(message)}
                  messageIndex={message.role === "user" ? messages.slice(0, i).filter(m => m.role === "user").length : undefined}
                />
              ))}
              {status === "submitted" && (
                <ChatMessage role="assistant" content="Thinking..." />
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input — floating overlay pinned to bottom */}
      <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none">
        {/* Chat steppers */}
        {!isAtBottom && messages.length > 0 && (
          <div className="flex justify-center mb-2 pointer-events-auto">
            <div className="flex items-center rounded-md border border-border shadow-md bg-background p-1 gap-1">
              <button
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                onClick={stepUp}
                disabled={stepIndex === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={stepDown}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Chat history sidebar */}
      <ChatHistory
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        activeChatId={activeChatId}
        onSelectChat={onSelectChat}
        onNewChat={onNewChat}
      />
    </div>
  );
}
