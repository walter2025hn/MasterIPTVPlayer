import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PremiumCheckout from "@/components/premium-checkout";

export default async function PremiumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: products }, { data: settings }, { data: orders }, { data: plan }] = await Promise.all([
    supabase.from("premium_products").select("id,name,duration_days,amount_usd,amount_hnl,regular_amount_usd,regular_amount_hnl,active").eq("active", true).order("sort_order"),
    supabase.from("payment_settings").select("manual_enabled,paypal_enabled,bank_instructions_usd,bank_instructions_hnl").eq("id", true).maybeSingle(),
    supabase.from("payment_orders").select("id,product_id,payment_method,currency,amount,status,receipt_path,admin_note,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
    supabase.from("customer_plans").select("plan_type,expires_at").eq("user_id", user.id).maybeSingle(),
  ]);
  return <PremiumCheckout userId={user.id} products={products ?? []} settings={settings ?? {manual_enabled:true,paypal_enabled:false,bank_instructions_usd:"",bank_instructions_hnl:""}} orders={orders ?? []} plan={plan ?? null} />;
}
