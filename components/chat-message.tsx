"use client";

import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Logo } from "@/components/logo";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 py-4", isUser && "flex-row-reverse")}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-transparent">
            <Logo size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "flex-1 overflow-hidden",
          isUser && "text-right"
        )}
      >
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            isUser &&
              "inline-block rounded-lg bg-primary dark:bg-zinc-800 px-3 py-2 text-primary-foreground dark:text-foreground text-left prose-p:text-primary-foreground dark:prose-p:text-foreground prose-strong:text-primary-foreground dark:prose-strong:text-foreground"
          )}
        >
          {isUser ? (
            <p className="m-0">{content}</p>
          ) : (
            <ReactMarkdown
              components={{
                a: ({ href, children }) => {
                  const isExternal = href && href !== "#";
                  if (isExternal) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 no-underline rounded bg-muted px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(href, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <ArrowUpRight className="inline h-3 w-3 shrink-0" />
                        {children}
                      </a>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-xs font-medium text-muted-foreground">
                      <BookOpen className="inline h-3 w-3 shrink-0" />
                      {children}
                    </span>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
