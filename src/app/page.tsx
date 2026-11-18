import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/dashboard";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: plan }, { count: sourceCount }, { count: deviceCount }] = await Promise.all([
    supabase.from("profiles").select("display_name,email,account_status").eq("id", user.id).maybeSingle(),
    supabase.from("customer_plans").select("plan_type,monthly_activation_limit,monthly_activation_count,counter_month,expires_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("iptv_sources").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("devices").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
  ]);

  return (
    <Dashboard
      email={profile?.email ?? user.email ?? ""}
      displayName={profile?.display_name || user.user_metadata?.display_name || "Cliente"}
      planType={plan?.plan_type ?? "free"}
      activationCount={plan?.monthly_activation_count ?? 0}
      activationLimit={plan?.monthly_activation_limit ?? 3}
      sourceCount={sourceCount ?? 0}
      deviceCount={deviceCount ?? 0}
      accountStatus={profile?.account_status ?? "active"}
      isAdmin={user.app_metadata?.role === "admin"}
    />
  );
}
