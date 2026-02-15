import { createClient } from "@/lib/supabase/server";

export type AuthResult =
  | { user: { id: string; email: string }; error: null }
  | { user: null; error: Response };

export async function requireApprovedUser(): Promise<AuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") {
    return {
      user: null,
      error: Response.json(
        { error: "Account pending approval" },
        { status: 403 }
      ),
    };
  }

  return {
    user: { id: user.id, email: user.email ?? "" },
    error: null,
  };
}
