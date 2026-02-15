"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import { Loader2, Download, ChevronLeft } from "lucide-react";
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

const MODE_LABELS: Record<IngestMode, string> = {
  url: "URL",
  text: "Text",
  youtube: "YouTube",
};

export default function IngestPage() {
  const [mode, setMode] = useState<IngestMode>("url");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<IngestResult[]>([]);

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
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Ingest Sources</h1>
      </div>

      {/* Mode switcher */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border p-1">
        {(Object.keys(MODE_LABELS) as IngestMode[]).map((m) => (
          <Button
            key={m}
            variant={mode === m ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setMode(m)}
          >
            {MODE_LABELS[m]}
          </Button>
        ))}
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
                placeholder={
                  "Paste one URL per line:\nhttps://example.com/article-1\nhttps://example.com/article-2\nhttps://example.com/article-3"
                }
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={8}
                className="text-sm"
              />
            )}

            {/* Text mode */}
            {mode === "text" && (
              <>
                <Input
                  placeholder="Title (required)"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="Author (optional)"
                  value={textAuthor}
                  onChange={(e) => setTextAuthor(e.target.value)}
                  className="text-sm"
                />
                <Textarea
                  placeholder="Paste the text content here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={10}
                  className="text-sm"
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
                  className="text-sm"
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
                    className="cursor-pointer"
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
            <Card key={i}>
              <CardContent className="flex items-center gap-3 py-3">
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
