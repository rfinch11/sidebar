import { requireApprovedUser } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category") || "";

  const supabase = getSupabase();

  let query = supabase
    .from("sources")
    .select("id, title, author, url, type, category, summary, created_at")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%`);
  }

  if (category) {
    query = query.contains("category", [category]);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ sources: data ?? [] });
}
