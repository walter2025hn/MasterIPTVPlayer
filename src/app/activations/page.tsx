import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalPage from "@/components/portal-page";

export default async function ActivationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("activation_events").select("id,event_type,details,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  return <PortalPage section="activations" email={user.email ?? ""} events={data ?? []} />;
}
