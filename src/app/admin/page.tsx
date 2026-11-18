import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "@/components/admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/");

  const [{ data: customers }, { data: plans }, { data: events }, { data: sources }, { data: devices }] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name,account_status,created_at").order("created_at", { ascending: false }).limit(250),
    supabase.from("customer_plans").select("user_id,plan_type,monthly_activation_limit,monthly_activation_count,expires_at"),
    supabase.from("activation_events").select("id,user_id,event_type,created_at,details").order("created_at", { ascending: false }).limit(100),
    supabase.from("iptv_sources").select("id,user_id,label,source_type,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("devices").select("id,user_id,device_name,platform,status,activated_at,last_seen_at").order("created_at", { ascending: false }).limit(500),
  ]);

  return <AdminDashboard customers={customers ?? []} plans={plans ?? []} events={events ?? []} sources={sources ?? []} devices={devices ?? []} />;
}
