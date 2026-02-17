"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import { Loader2, Download, ChevronLeft, Link as LinkIcon, FileText, Play } from "lucide-react";
import Link from "next/link";

type IngestMode = "url" | "text" | "youtube";

interface IngestResult {
  label: string;
  status: "success" | "error" | "pending";
  message: string;
}

async function ingestSource(
  body: Record<string, unknown>
): Promise<IngestResult> {
  const label =
    (body.title as string) || (body.url as string) || "Unknown source";
  try {
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
      label,
      status: res.ok ? "success" : "error",
      message: data.message || data.error,
    };
  } catch {
    return { label, status: "error", message: "Network error" };
  }
}

const MODE_CONFIG: Record<IngestMode, { label: string; icon: React.ReactNode }> = {
  url: { label: "URL", icon: <LinkIcon className="h-4 w-4" /> },
  text: { label: "Text", icon: <FileText className="h-4 w-4" /> },
  youtube: { label: "YouTube", icon: <Play className="h-4 w-4" /> },
};

export default function IngestPage() {
  const [mode, setMode] = useState<IngestMode>("url");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<IngestResult[]>([]);

  // Tab animation refs
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const hasMounted = useRef(false);

  useLayoutEffect(() => {
    const container = tabContainerRef.current;
    const activeTab = activeTabRef.current;
    if (!container || !activeTab) return;

    const { offsetLeft, offsetWidth } = activeTab;
    const clipRight = 100 - ((offsetLeft + offsetWidth) / container.offsetWidth) * 100;
    const clipLeft = (offsetLeft / container.offsetWidth) * 100;

    // Disable transition on first render to avoid animating from hidden
    if (!hasMounted.current) {
      container.style.transition = "none";
      hasMounted.current = true;
      // Re-enable transition after paint
      requestAnimationFrame(() => {
        container.style.transition = "";
      });
    }

    container.style.clipPath = `inset(0 ${clipRight.toFixed(1)}% 0 ${clipLeft.toFixed(1)}% round 7px)`;
  }, [mode]);

  // URL mode
  const [urls, setUrls] = useState("");

  // Text mode
  const [textTitle, setTextTitle] = useState("");
  const [textAuthor, setTextAuthor] = useState("");
  const [textContent, setTextContent] = useState("");

  // YouTube mode
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const resetFields = () => {
    setUrls("");
    setTextTitle("");
    setTextAuthor("");
    setTextContent("");
    setYoutubeUrl("");
    setCategories([]);
  };

  const canSubmit = () => {
    if (isLoading) return false;
    if (mode === "url") return urls.trim().length > 0;
    if (mode === "text") return textTitle.trim().length > 0 && textContent.trim().length > 0;
    if (mode === "youtube") return youtubeUrl.trim().length > 0;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setIsLoading(true);

    if (mode === "url") {
      const urlList = urls
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      setProgress({ done: 0, total: urlList.length });

      for (let i = 0; i < urlList.length; i++) {
        const result = await ingestSource({
          type: "url",
          url: urlList[i],
          categories: categories.length > 0 ? categories : undefined,
        });
        setResults((prev) => [result, ...prev]);
        setProgress({ done: i + 1, total: urlList.length });
      }
    } else if (mode === "text") {
      setProgress({ done: 0, total: 1 });
      const result = await ingestSource({
        type: "text",
        title: textTitle.trim(),
        author: textAuthor.trim() || undefined,
        text: textContent,
        categories: categories.length > 0 ? categories : undefined,
      });
      setResults((prev) => [result, ...prev]);
      setProgress({ done: 1, total: 1 });
    } else if (mode === "youtube") {
      setProgress({ done: 0, total: 1 });
      const result = await ingestSource({
        type: "youtube",
        url: youtubeUrl.trim(),
        categories: categories.length > 0 ? categories : undefined,
      });
      setResults((prev) => [result, ...prev]);
      setProgress({ done: 1, total: 1 });
    }

    resetFields();
    setIsLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pb-6 sm:pb-8">
      <div className="sticky top-0 z-10 bg-background pt-6 sm:pt-8 pb-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Ingest Sources</h1>
      </div>

      {/* Mode switcher */}
      <div className="relative mb-4 rounded-lg border border-border p-1">
        {/* Base layer — inactive styling */}
        <div className="flex gap-1">
          {(Object.keys(MODE_CONFIG) as IngestMode[]).map((m) => (
            <button
              key={m}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMode(m)}
            >
              {MODE_CONFIG[m].icon}
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
        {/* Overlay layer — active styling, clipped to active tab */}
        <div
          aria-hidden
          ref={tabContainerRef}
          className="pointer-events-none absolute inset-[4px] z-10 overflow-hidden transition-[clip-path] duration-[250ms] ease-[ease]"
          style={{ clipPath: "inset(0 100% 0 0% round 7px)" }}
        >
          <div className="flex gap-1 h-full bg-primary rounded-md">
            {(Object.keys(MODE_CONFIG) as IngestMode[]).map((m) => (
              <button
                key={m}
                ref={mode === m ? activeTabRef : null}
                tabIndex={-1}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                {MODE_CONFIG[m].icon}
                {MODE_CONFIG[m].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "url" && "Add URLs"}
            {mode === "text" && "Paste Text"}
            {mode === "youtube" && "YouTube Video"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL mode */}
            {mode === "url" && (
              <Textarea
                placeholder="Paste one URL per line"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={8}
                className="text-base"
              />
            )}

            {/* Text mode */}
            {mode === "text" && (
              <>
                <Input
                  placeholder="Title (required)"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="text-base"
                />
                <Input
                  placeholder="Author (optional)"
                  value={textAuthor}
                  onChange={(e) => setTextAuthor(e.target.value)}
                  className="text-base"
                />
                <Textarea
                  placeholder="Paste the text content here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={10}
                  className="text-base"
                />
              </>
            )}

            {/* YouTube mode */}
            {mode === "youtube" && (
              <div className="space-y-2">
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  The video must have captions available (auto-generated or manual).
                </p>
              </div>
            )}

            {/* Category badges (shared) */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Category (optional):
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant={categories.includes(cat) ? "default" : "outline"}
                    className={`cursor-pointer text-sm ${categories.includes(cat) ? "" : "text-muted-foreground"}`}
                    onClick={() =>
                      setCategories((prev) =>
                        prev.includes(cat)
                          ? prev.filter((c) => c !== cat)
                          : [...prev, cat]
                      )
                    }
                  >
                    {CATEGORY_LABELS[cat]}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingesting {progress.done}/{progress.total}...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Ingest
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Results
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setResults([])}
            >
              Clear
            </Button>
          </div>
          {results.map((result, i) => (
            <Card key={i} className="shadow-none hover:shadow-sm transition-shadow py-0">
              <CardContent className="flex items-center gap-3 px-4 py-4">
                <Badge
                  variant={
                    result.status === "success" ? "default" : "destructive"
                  }
                >
                  {result.status}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{result.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
