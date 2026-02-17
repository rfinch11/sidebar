"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import {
  ChevronLeft,
  Search,
  Link as LinkIcon,
  FileText,
  Play,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

interface Source {
  id: string;
  title: string | null;
  author: string | null;
  url: string | null;
  type: string;
  category: string[] | null;
  summary: string | null;
  created_at: string;
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

const TYPE_ICON: Record<string, React.ReactNode> = {
  url: <LinkIcon className="h-3.5 w-3.5" />,
  text: <FileText className="h-3.5 w-3.5" />,
  youtube: <Play className="h-3.5 w-3.5" />,
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSources = (q: string, cat: Category | null) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("category", cat);

    fetch(`/api/sources?${params}`)
      .then((res) => res.json())
      .then((data) => setSources(data.sources ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Initial load
  useEffect(() => {
    fetchSources("", null);
  }, []);

  // Debounced search
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
          placeholder="Search by title or author..."
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
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading...
        </p>
      ) : sources.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No sources found
        </p>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <a
              key={source.id}
              href={source.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={source.url ? "cursor-pointer" : "cursor-default"}
            >
            <Card className="shadow-none hover:shadow-sm transition-shadow py-0">
              <CardContent className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    {TYPE_ICON[source.type] ?? TYPE_ICON.url}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm leading-snug">
                      {source.title || "Untitled"}
                      {source.url && (
                        <ArrowUpRight className="inline h-3.5 w-3.5 ml-1 text-muted-foreground" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[source.author, formatRelativeDate(source.created_at)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {source.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {source.summary}
                      </p>
                    )}
                    {source.category && source.category.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {source.category.map((cat) => (
                          <Badge
                            key={cat}
                            variant="secondary"
                            className="text-[11px] px-1.5 py-0"
                          >
                            {CATEGORY_LABELS[cat as Category] || cat}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
