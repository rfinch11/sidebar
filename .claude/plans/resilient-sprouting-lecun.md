# Sources Browser Page

## Context

The app has ingested sources (articles, text, YouTube transcripts) stored in Supabase but there's no way to browse them. The user wants a page to list all sources with search and category filters, styled like the existing Ingest page, accessible from the profile menu, and optimized for mobile.

## Approach

### 1. API route: `app/api/sources/route.ts`

New `GET` endpoint that returns all sources with metadata. Supports query params for filtering:
- `q` — text search on title/author (ilike)
- `category` — filter by category (array contains)

Returns: `{ sources: [{ id, title, author, url, type, category, summary, created_at }] }`

Uses `getSupabase()` (service role) with `requireApprovedUser()` auth check. Orders by `created_at` descending. Selects only the columns needed (no `raw_text` to keep payloads small).

### 2. Page: `app/sources/page.tsx`

Client component styled identically to the Ingest page:
- Same `mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8` container
- Same back button + title header pattern (`ChevronLeft` + "Sources")
- Search input at top (debounced, 300ms)
- Category filter row using `Badge` components (same pattern as Ingest page categories) — tap to toggle, multi-select
- Source list as `Card` components, each showing:
  - Title (bold, truncated if needed)
  - Author + relative date on a secondary line
  - Category badges
  - Type indicator (URL links out via external link icon, YouTube/Text shows icon)
- Empty state when no results
- Loading state

### 3. Profile menu: `components/profile-menu.tsx`

Add a "Sources" link between "Ingest sources" and the theme toggle, using `Library` icon from lucide-react.

## Files to create/modify

- `app/api/sources/route.ts` (new)
- `app/sources/page.tsx` (new)
- `components/profile-menu.tsx` (modify — add menu item)

## Reuse

- `CATEGORIES`, `CATEGORY_LABELS` from `lib/constants.ts`
- `Badge` from `components/ui/badge.tsx` (same toggle pattern as Ingest page)
- `Card`, `CardContent` from `components/ui/card.tsx`
- `Input` from `components/ui/input.tsx`
- `Button` from `components/ui/button.tsx`
- `requireApprovedUser()` from `lib/supabase/auth.ts`
- `getSupabase()` from `lib/supabase.ts`
- `formatRelativeDate()` — inline helper (same pattern as chat-history)

## Verification

1. `npm run build` passes
2. Navigate to Sources from profile menu
3. All ingested sources display with correct metadata
4. Search filters by title/author in real time
5. Category badges filter correctly (multi-select)
6. Mobile: full-width cards, touch-friendly badges, no horizontal overflow
