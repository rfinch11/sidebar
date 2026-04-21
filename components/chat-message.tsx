"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowRight, BookOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  messageIndex?: number;
  isStreaming?: boolean;
  onFollowUp?: (question: string) => void;
}

// Reveals content at a steady pace (~16 chars/frame).
// When streaming ends, lets the animation finish rather than cutting off.
function useSmoothStream(target: string, isStreaming: boolean) {
  const [displayed, setDisplayed] = useState(target);
  const targetRef = useRef(target);
  const displayedRef = useRef(target);
  const isStreamingRef = useRef(isStreaming);
  const rafRef = useRef<number | null>(null);

  targetRef.current = target;
  isStreamingRef.current = isStreaming;

  // Start animation whenever new content arrives
  useEffect(() => {
    if (rafRef.current) return; // already running
    if (displayedRef.current.length >= target.length) return; // already caught up

    const animate = () => {
      const latest = targetRef.current;
      const current = displayedRef.current;

      if (current.length >= latest.length) {
        rafRef.current = null;
        // Animation caught up — if streaming is done, snap to ensure exact final content
        if (!isStreamingRef.current) {
          setDisplayed(latest);
        }
        return;
      }

      const next = latest.slice(0, current.length + 16);
      displayedRef.current = next;
      setDisplayed(next);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [target]);

  // When streaming ends and animation already finished, snap to final content
  useEffect(() => {
    if (!isStreaming && rafRef.current === null) {
      displayedRef.current = target;
      setDisplayed(target);
    }
  }, [isStreaming, target]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return displayed;
}

function splitFollowUps(content: string): { main: string; followUps: string[] } {
  // Strip the Sources section
  const withoutSources = content.replace(/\*\*Sources\*\*\s*\n([\s\S]*?)(\n\n|\n(?=\*\*)|$)/i, "\n");

  const match = withoutSources.match(/\*\*Go deeper\*\*\s*\n([\s\S]*)$/i);
  if (!match) return { main: withoutSources.trim(), followUps: [] };

  const main = withoutSources.slice(0, match.index).trim();
  const followUps = [...match[1].matchAll(/^[-*]\s+(.+)$/gm)].map((m) => m[1].trim());
  return { main, followUps };
}

const mdComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const isExternal = href && href !== "#";
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 no-underline rounded bg-background px-1 py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
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
      <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-sm font-medium text-muted-foreground">
        <BookOpen className="inline h-3 w-3 shrink-0" />
        {children}
      </span>
    );
  },
};

export function ChatMessage({ role, content, messageIndex, isStreaming, onFollowUp }: ChatMessageProps) {
  const isUser = role === "user";
  const smoothContent = useSmoothStream(content, isStreaming ?? false);
  const { main, followUps } = isUser ? { main: smoothContent, followUps: [] } : splitFollowUps(smoothContent);
  const showChips = !isStreaming && followUps.length > 0 && !!onFollowUp;

  return (
    <div
      className={cn("flex gap-3 py-4", isUser && "flex-row-reverse")}
      {...(isUser && messageIndex !== undefined ? { "data-user-msg": messageIndex } : {})}
    >
      <div className={cn("flex-1 overflow-hidden", isUser && "text-right")}>
        <div
          className={cn(
            "prose dark:prose-invert max-w-none",
            isUser &&
              "inline-block rounded-lg bg-secondary dark:bg-zinc-800 px-3 py-2 text-muted-foreground dark:text-foreground text-left prose-p:text-muted-foreground dark:prose-p:text-foreground prose-strong:text-muted-foreground dark:prose-strong:text-foreground"
          )}
        >
          {isUser ? (
            <p className="m-0">{content}</p>
          ) : (
            <ReactMarkdown components={mdComponents}>{main}</ReactMarkdown>
          )}
        </div>

        {showChips && (
          <div className="mt-3 flex flex-col gap-2">
            {followUps.map((q) => (
              <button
                key={q}
                onClick={() => onFollowUp(q)}
                className="group w-full text-left rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground active:scale-[0.99] flex items-center justify-between gap-2"
              >
                <span>{q}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
