import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalPage from "@/components/portal-page";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: plan }] = await Promise.all([
    supabase.from("profiles").select("display_name,email,account_status,created_at").eq("id", user.id).maybeSingle(),
    supabase.from("customer_plans").select("plan_type,monthly_activation_limit,monthly_activation_count,expires_at").eq("user_id", user.id).maybeSingle(),
  ]);
  return <PortalPage section="account" email={user.email ?? ""} profile={profile} plan={plan} />;
}
