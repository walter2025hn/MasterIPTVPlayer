"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Product={id:string;name:string;duration_days:number;amount_usd:number|null;amount_hnl:number|null;regular_amount_usd:number|null;regular_amount_hnl:number|null;active:boolean};
type Order={id:string;product_id:string;payment_method:string;currency:string;amount:number;status:string;receipt_path:string|null;admin_note:string|null;created_at:string};
type Props={userId:string;products:Product[];settings:{manual_enabled:boolean;paypal_enabled:boolean;bank_instructions_usd:string;bank_instructions_hnl:string};orders:Order[];plan:{plan_type:string;expires_at:string|null}|null};
const money=(amount:number,currency:string)=>new Intl.NumberFormat(currency==="HNL"?"es-HN":"en-US",{style:"currency",currency,minimumFractionDigits:2}).format(amount);
const statusLabel:Record<string,string>={pending:"Pendiente de comprobante",under_review:"En revisión",paid:"Pagado",rejected:"Rechazado",cancelled:"Cancelado"};
export default function PremiumCheckout({userId,products,settings,orders,plan}:Props){
 const [currency,setCurrency]=useState<"USD"|"HNL">("USD");
 const [method,setMethod]=useState<"manual"|"paypal">("manual");
 const router=useRouter();
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const orderId=params.get("order"),token=params.get("token");if(params.get("paypal")==="success"&&orderId&&token){setBusy(true);fetch("/api/payments/paypal/capture",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,paypalOrderId:token})}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudo confirmar el pago.");setMessage("Pago confirmado por PayPal. Tu plan Premium ya está activo.");window.history.replaceState({}, "", "/premium");router.refresh();}).catch(e=>setError(e instanceof Error?e.message:"No se pudo confirmar el pago.")).finally(()=>setBusy(false));}else if(params.get("paypal")==="cancel"){setMessage("El pago fue cancelado. No se realizó ningún cobro.");window.history.replaceState({}, "", "/premium");}},[router]);
 const [selected,setSelected]=useState(products[0]?.id??"");
 const [receipt,setReceipt]=useState<File|null>(null);
 const supabase=createClient();
 const product=products.find(p=>p.id===selected);
 const amount=product?(currency==="USD"?product.amount_usd:product.amount_hnl):null;
 async function createOrder(){
  setBusy(true);setError("");setMessage("");
  try{
   if(!product||!amount||amount<=0)throw new Error("Este plan todavía no tiene precio configurado en esa moneda.");
   if(method==="manual"&&!receipt)throw new Error("Selecciona el comprobante de pago antes de continuar.");
   if(method==="paypal"){const r=await fetch("/api/payments/paypal/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:selected,currency})});const d=await r.json();if(!r.ok||!d.approvalUrl)throw new Error(d.error||"No se pudo iniciar PayPal.");window.location.href=d.approvalUrl;return;}
   const {data:orderId,error:rpcError}=await supabase.rpc("create_payment_order",{p_product_id:selected,p_currency:currency,p_method:method});
   if(rpcError||!orderId)throw rpcError??new Error("No se pudo crear el pedido.");
   const ext=receipt.name.split(".").pop()?.toLowerCase()||"jpg";
   const path=userId+"/"+orderId+"."+ext;
   const {error:uploadError}=await supabase.storage.from("payment-receipts").upload(path,receipt,{upsert:false,contentType:receipt.type});
   if(uploadError)throw uploadError;
   const {error:updateError}=await supabase.from("payment_orders").update({receipt_path:path,status:"under_review"}).eq("id",orderId);
   if(updateError)throw updateError;
   setMessage("Comprobante enviado. El administrador revisará el pago y activará Premium cuando lo apruebe.");
   window.location.reload();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo enviar el pago.");}
  finally{setBusy(false);}
 }
 return <main className="premium-page">
  <header className="admin-header"><Link className="brand" href="/"><img className="brand-logo" src="/master-logo.svg" alt="Master IPTV Player"/><span><strong>MASTER</strong><small>IPTV PLAYER</small></span></Link><Link className="admin-back" href="/">← Volver al panel</Link></header>
  <div className="premium-content">
   <div className="eyebrow">MASTER IPTV PLAYER · SUSCRIPCIÓN</div><h1>Activa tu plan <span>Premium</span></h1>
   <p className="subtitle">Elige la duración, la moneda y cómo deseas pagar. Premium habilita activaciones y dispositivos ilimitados durante la vigencia de tu suscripción.</p>
   <section className="portal-card"><div className="premium-current"><div><small>PLAN ACTUAL</small><strong>{plan?.plan_type==="premium"?"Premium":"Gratis"}</strong></div><div><small>VENCE</small><strong>{plan?.expires_at?new Date(plan.expires_at).toLocaleDateString("es-HN"):"—"}</strong></div></div>
    <h2>1. Elige tu plan</h2><div className="premium-products">{products.map(p=>{const price=currency==="USD"?p.amount_usd:p.amount_hnl;const regular=currency==="USD"?p.regular_amount_usd:p.regular_amount_hnl;return <button type="button" key={p.id} className={selected===p.id?"premium-product selected":"premium-product"} onClick={()=>setSelected(p.id)}><em className="discount-tag">OFERTA DE LANZAMIENTO</em><strong>{p.name}</strong><span>{p.duration_days} días</span>{regular&&price&&regular>price&&<del>{money(regular,currency)}</del>}<b>{price&&price>0?money(price,currency):"Precio por configurar"}</b><small className="discount-caption">Precio especial de lanzamiento</small></button>})}</div>
    <h2>2. Moneda</h2><div className="portal-tabs"><button className={currency==="USD"?"selected":""} onClick={()=>setCurrency("USD")}>Dólares (USD)</button><button className={currency==="HNL"?"selected":""} onClick={()=>setCurrency("HNL")}>Lempiras (HNL)</button></div>
    <h2>3. Método de pago</h2><div className="portal-tabs"><button className={method==="manual"?"selected":""} onClick={()=>setMethod("manual")} disabled={!settings.manual_enabled}>Transferencia / depósito</button><button className={method==="paypal"?"selected":""} onClick={()=>setMethod("paypal")} disabled={!settings.paypal_enabled}>Pago automático</button></div>
    {method==="manual"&&<div className="payment-instructions"><strong>Instrucciones para pagar en {currency}</strong><p>{currency==="USD"?settings.bank_instructions_usd:settings.bank_instructions_hnl||"El administrador todavía no ha configurado las instrucciones para esta moneda."}</p><label>Adjunta tu comprobante (imagen o PDF)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setReceipt(e.target.files?.[0]??null)}/></label><button className="primary-action" disabled={busy||!amount||!receipt} onClick={createOrder}>{busy?"Procesando…":"Enviar comprobante"} →</button></div>}
    {method==="paypal"&&<div className="payment-instructions"><strong>Pago automático con PayPal</strong><p>{currency==="USD"?"Serás enviado al checkout seguro de PayPal. Premium se activa solo después de que PayPal confirme el cobro y el servidor valide el importe y la moneda.":"PayPal no admite HNL en este checkout. Para pagar en lempiras, selecciona Transferencia / depósito."}</p><button className="primary-action" disabled={busy||!amount||currency!=="USD"} onClick={createOrder}>{busy?"Conectando…":"Continuar a PayPal"} →</button></div>}
    {error&&<div className="form-alert error">{error}</div>}{message&&<div className="form-alert success">{message}</div>}
   </section>
   <section className="portal-card"><h2>Historial de pagos</h2>{orders.length===0?<div className="empty-state">Todavía no tienes pagos registrados.</div>:<div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Fecha</th><th>Importe</th><th>Método</th><th>Estado</th><th>Nota</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleDateString("es-HN")}</td><td>{money(o.amount,o.currency)}</td><td>{o.payment_method==="manual"?"Transferencia":"Automático"}</td><td>{statusLabel[o.status]??o.status}</td><td>{o.admin_note??"—"}</td></tr>)}</tbody></table></div>}</section>
  </div>
 </main>;
}
