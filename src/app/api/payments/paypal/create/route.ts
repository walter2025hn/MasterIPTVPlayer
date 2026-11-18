import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
async function paypalToken(){
 const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;
 if(!id||!secret)throw new Error("PayPal todavía no está conectado: faltan las credenciales del servidor.");
 const base=process.env.PAYPAL_ENV==="live"?"https://api-m.paypal.com":"https://api-m.sandbox.paypal.com";
 const auth=Buffer.from(id+":"+secret).toString("base64");
 const r=await fetch(base+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});
 const d=await r.json();if(!r.ok||!d.access_token)throw new Error("PayPal no autorizó la conexión.");
 return {base,token:d.access_token};
}
export async function POST(request:Request){
 try{
  const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Inicia sesión."},{status:401});
  const b=await request.json();const productId=String(b.productId??""),currency=String(b.currency??"");
  const {base,token}=await paypalToken();
  const {data:orderId,error:rpcError}=await s.rpc("create_payment_order",{p_product_id:productId,p_currency:currency,p_method:"paypal"});
  if(rpcError||!orderId)throw new Error(rpcError?.message??"No se pudo crear el pedido.");
  const {data:order,error:orderError}=await s.from("payment_orders").select("amount,currency").eq("id",orderId).eq("user_id",user.id).single();
  if(orderError||!order)throw new Error("No se pudo consultar el pedido.");
  const site=process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin;
  const response=await fetch(base+"/v2/checkout/orders",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({
   intent:"CAPTURE",purchase_units:[{reference_id:orderId,custom_id:orderId,amount:{currency_code:order.currency,value:Number(order.amount).toFixed(2)}}],
   application_context:{brand_name:"Master IPTV Player",user_action:"PAY_NOW",return_url:site+"/premium?paypal=success&order="+orderId,cancel_url:site+"/premium?paypal=cancel"}
  }),cache:"no-store"});
  const data=await response.json();if(!response.ok||!data.id)throw new Error("PayPal no pudo crear el checkout.");
  const {error:updateError}=await s.from("payment_orders").update({external_order_id:data.id}).eq("id",orderId).eq("user_id",user.id);
  if(updateError)throw updateError;
  const approval=data.links?.find((x:any)=>x.rel==="approve")?.href;if(!approval)throw new Error("PayPal no devolvió el enlace de aprobación.");
  return NextResponse.json({approvalUrl:approval});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Error al iniciar PayPal."},{status:400});}
}
