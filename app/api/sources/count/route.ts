import { requireApprovedUser } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  const { count } = await getSupabase()
    .from("sources")
    .select("*", { count: "exact", head: true });

  return Response.json({ count: count ?? 0 });
}
