import { createClient } from "@/lib/supabase/server";
import { requireApprovedUser } from "@/lib/supabase/auth";

export async function GET() {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ conversations: data ?? [] });
}
