import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPayments from "@/components/admin-payments";
export default async function AdminPaymentsPage(){
 const s=await createClient();const {data:{user}}=await s.auth.getUser();
 if(!user)redirect("/login");if(user.app_metadata?.role!=="admin")redirect("/");
 const [{data:orders},{data:products},{data:settings},{data:profiles}]=await Promise.all([
  s.from("payment_orders").select("id,user_id,product_id,payment_method,currency,amount,status,receipt_path,admin_note,created_at").order("created_at",{ascending:false}).limit(200),
  s.from("premium_products").select("*").order("sort_order"),
  s.from("payment_settings").select("*").eq("id",true).maybeSingle(),
  s.from("profiles").select("id,email,display_name")
 ]);
 return <AdminPayments orders={orders??[]} products={products??[]} settings={settings} profiles={profiles??[]}/>;
}
