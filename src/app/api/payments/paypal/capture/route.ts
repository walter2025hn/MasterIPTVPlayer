import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Inicia sesión."},{status:401});
  const b=await request.json();const orderId=String(b.orderId??""),paypalOrderId=String(b.paypalOrderId??"");
  const {data:order,error}=await s.from("payment_orders").select("id,amount,currency,external_order_id,status").eq("id",orderId).eq("user_id",user.id).single();
  if(error||!order||order.payment_method==="manual"||order.external_order_id!==paypalOrderId)throw new Error("El pedido no coincide con tu cuenta.");
  if(order.status==="paid")return NextResponse.json({success:true});
  const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;if(!id||!secret)throw new Error("PayPal no está configurado.");
  const base=process.env.PAYPAL_ENV==="live"?"https://api-m.paypal.com":"https://api-m.sandbox.paypal.com";
  const auth=Buffer.from(id+":"+secret).toString("base64");
  const tr=await fetch(base+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});
  const td=await tr.json();if(!tr.ok||!td.access_token)throw new Error("No se pudo validar con PayPal.");
  const cr=await fetch(base+"/v2/checkout/orders/"+encodeURIComponent(paypalOrderId)+"/capture",{method:"POST",headers:{Authorization:"Bearer "+td.access_token,"Content-Type":"application/json"},body:"{}",cache:"no-store"});
  const cd=await cr.json();if(!cr.ok)throw new Error("PayPal no pudo confirmar el cobro.");
  const capture=cd.purchase_units?.[0]?.payments?.captures?.[0];
  if(cd.status!=="COMPLETED"||capture?.status!=="COMPLETED"||capture?.amount?.currency_code!==order.currency||Number(capture?.amount?.value)!==Number(order.amount))throw new Error("El importe o estado confirmado por PayPal no coincide.");
  const {error:completeError}=await s.rpc("complete_paypal_payment",{p_order_id:orderId,p_paypal_order_id:paypalOrderId,p_capture_id:String(capture.id)});
  if(completeError)throw completeError;
  return NextResponse.json({success:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"No se pudo confirmar el pago."},{status:400});}
}
