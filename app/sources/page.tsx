"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import {
  ChevronLeft,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Link as LinkIcon,
  FileText,
  Play,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

interface SourceResult {
  id: string;
  title: string | null;
  author: string | null;
  url: string | null;
  type: string;
  category: string[] | null;
  summary: string | null;
  raw_text: string | null;
  created_at: string;
  excerpt: string | null;
}

type ExpansionLevel = 0 | 1 | 2;

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ingested just now";
  if (diffMins < 60) return `Ingested ${diffMins}m ago`;
  if (diffHours < 24) return `Ingested ${diffHours}h ago`;
  if (diffDays === 1) return "Ingested yesterday";
  if (diffDays < 7) return `Ingested ${diffDays}d ago`;
  return `Ingested ${date.toLocaleDateString()}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getContextExcerpt(chunk: string, query: string, radius = 140): string {
  const idx = chunk.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return chunk.slice(0, 300) + (chunk.length > 300 ? "…" : "");
  const start = Math.max(0, idx - radius);
  const end = Math.min(chunk.length, idx + query.length + radius);
  return (start > 0 ? "…" : "") + chunk.slice(start, end) + (end < chunk.length ? "…" : "");
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/25 text-foreground rounded-[2px] not-italic">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  url: <LinkIcon className="h-3.5 w-3.5" />,
  text: <FileText className="h-3.5 w-3.5" />,
  youtube: <Play className="h-3.5 w-3.5" />,
};

function SourceCard({
  source,
  query,
  level,
  onSetLevel,
}: {
  source: SourceResult;
  query: string;
  level: ExpansionLevel;
  onSetLevel: (l: ExpansionLevel) => void;
}) {
  const excerptText =
    source.excerpt
      ? getContextExcerpt(source.excerpt, query)
      : source.summary || null;

  return (
    <Card className="shadow-none transition-shadow py-0 overflow-hidden">
      <CardContent className="px-4 py-4">
        {/* Level 0: header row — always visible */}
        <button
          className="w-full text-left"
          onClick={() => onSetLevel(level === 0 ? 1 : 0)}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-muted-foreground">
              {TYPE_ICON[source.type] ?? TYPE_ICON.url}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm leading-snug pr-6 truncate">
                {source.title || "Untitled"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[source.author, formatRelativeDate(source.created_at)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          </div>
        </button>

        {/* Level 1: excerpt */}
        {level >= 1 && excerptText && (
          <div className="mt-3 pl-6">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <HighlightText text={excerptText} query={query} />
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {source.raw_text && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetLevel(level === 2 ? 1 : 2);
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {level === 2 ? "Hide full text" : "Show full text"}
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${level === 2 ? "rotate-180" : ""}`} />
                  </span>
                </button>
              )}
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Open source <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Level 1 (no excerpt): show summary fallback + actions */}
        {level >= 1 && !excerptText && (
          <div className="mt-3 pl-6">
            <div className="flex flex-wrap items-center gap-2">
              {source.raw_text && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetLevel(level === 2 ? 1 : 2);
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {level === 2 ? "Hide full text" : "Show full text"}
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${level === 2 ? "rotate-180" : ""}`} />
                  </span>
                </button>
              )}
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Open source <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Level 2: full text */}
        {level === 2 && source.raw_text && (
          <div className="mt-3 pl-6">
            <div className="max-h-80 overflow-y-auto">
              <p className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground">
                {source.raw_text}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [expansions, setExpansions] = useState<Record<string, ExpansionLevel>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSources = useCallback((q: string, cat: Category | null) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("category", cat);

    fetch(`/api/sources?${params}`)
      .then((res) => res.json())
      .then((data) => {
        const results: SourceResult[] = data.sources ?? [];
        setSources(results);
        // Auto-expand to excerpt level when searching, collapse when clearing
        if (q) {
          const next: Record<string, ExpansionLevel> = {};
          for (const s of results) next[s.id] = 1;
          setExpansions(next);
        } else {
          setExpansions({});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSources("", null);
  }, [fetchSources]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSources(value, activeCategory);
    }, 300);
  };

  const handleCategoryToggle = (cat: Category) => {
    const next = activeCategory === cat ? null : cat;
    setActiveCategory(next);
    fetchSources(query, next);
  };

  const setLevel = (id: string, level: ExpansionLevel) => {
    setExpansions((prev) => ({ ...prev, [id]: level }));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pb-6 sm:pb-8">
      <div className="sticky top-0 z-10 bg-background pt-6 sm:pt-8 pb-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Sources</h1>
        {!loading && sources.length > 0 && (
          <span className="text-sm text-emerald-600">{sources.length} available</span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search titles, authors, or content…"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 text-base"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            className={`cursor-pointer text-sm ${activeCategory === cat ? "" : "text-muted-foreground"}`}
            onClick={() => handleCategoryToggle(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </Badge>
        ))}
      </div>

      {/* Source list */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : sources.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No sources found</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              query={query}
              level={(expansions[source.id] ?? 0) as ExpansionLevel}
              onSetLevel={(l) => setLevel(source.id, l)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
