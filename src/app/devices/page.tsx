import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalPage from "@/components/portal-page";

export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(params.code ? `/login?next=${encodeURIComponent(`/devices?code=${params.code}`)}` : "/login");
  const [{ data: devices }, { data: sources }] = await Promise.all([
    supabase.from("devices").select("id,device_name,platform,status,source_id,activated_at,last_seen_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("iptv_sources").select("id,label,source_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false })
  ]);
  return <PortalPage section="devices" email={user.email ?? ""} devices={devices ?? []} sources={sources ?? []} initialCode={params.code ?? ""} />;
}
