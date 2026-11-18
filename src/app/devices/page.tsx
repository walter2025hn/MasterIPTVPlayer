import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalPage from "@/components/portal-page";

export default async function DevicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("devices").select("id,device_name,platform,status,activated_at,last_seen_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  return <PortalPage section="devices" email={user.email ?? ""} devices={data ?? []} />;
}
