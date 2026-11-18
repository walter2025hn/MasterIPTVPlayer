import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalPage from "@/components/portal-page";

export default async function ListsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("iptv_sources").select("id,label,source_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  return <PortalPage section="lists" email={user.email ?? ""} sources={data ?? []} />;
}
