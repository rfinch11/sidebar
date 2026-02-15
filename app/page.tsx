"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ChatHistory } from "@/components/chat-history";
import { createClient } from "@/lib/supabase/client";
import { ArrowDown } from "lucide-react";
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
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
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

  // Load conversation on mount
  useEffect(() => {
    const savedId = sessionStorage.getItem("activeChatId");
    if (savedId) {
      setPendingLoadId(savedId);
    }
  }, []);

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
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { root: scrollRef.current, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
    <div className="relative flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
        <div className="mx-auto max-w-3xl px-6">
          {messages.length === 0 ? (
            <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center text-center">
              <div className="mb-4 flex items-center gap-2">
                <Logo size={40} />
                <h2 className="text-xl font-semibold">Sidebar</h2>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Curated sources on design leadership
              </p>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role as "user" | "assistant"}
                  content={getMessageText(message)}
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

      {/* Input */}
      <div className="z-10 bg-background">
        {/* Scroll to bottom FAB */}
        {!isAtBottom && messages.length > 0 && (
          <div className="flex justify-center -mt-4 mb-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full shadow-md !bg-background border-border hover:!bg-accent hover:text-accent-foreground transition-colors"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="mx-auto max-w-3xl px-6 py-4">
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
