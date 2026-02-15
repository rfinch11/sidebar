import { createClient } from "@/lib/supabase/server";
import { requireApprovedUser } from "@/lib/supabase/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, messages, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
