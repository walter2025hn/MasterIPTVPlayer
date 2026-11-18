"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = { id:string; email:string|null; display_name:string|null; account_status:string; created_at:string };
type Plan = { user_id:string; plan_type:string; monthly_activation_limit:number; monthly_activation_count:number; expires_at:string|null };
type Source = { id:string; user_id:string; label:string; source_type:string; created_at:string };
type Device = { id:string; user_id:string; device_name:string|null; platform:string; status:string; activated_at:string|null; last_seen_at:string|null };
type Event = { id:string; user_id:string; event_type:string; created_at:string; details:unknown };
type Props = { customers:Customer[]; plans:Plan[]; sources:Source[]; devices:Device[]; events:Event[] };

function date(value?:string|null){return value?new Date(value).toLocaleString("es-HN",{dateStyle:"medium",timeStyle:"short"}):"—"}

export default function AdminDashboard({customers,plans,sources,devices,events}:Props){
  const supabase=createClient();
  const [query,setQuery]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");
  const [password,setPassword]=useState("");
  const [newPlan,setNewPlan]=useState("free");
  const [newLimit,setNewLimit]=useState("3");
  const [showCreate,setShowCreate]=useState(false);
  const [refresh,setRefresh]=useState(0);

  const planMap=useMemo(()=>new Map(plans.map(p=>[p.user_id,p])),[plans]);
  const filtered=customers.filter(c=>(c.email??"").toLowerCase().includes(query.toLowerCase())||(c.display_name??"").toLowerCase().includes(query.toLowerCase()));

  async function createCustomer(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("admin-create-customer",{body:{email,password,displayName:name,planType:newPlan,monthlyLimit:Number(newLimit)}});
      if(invokeError)throw invokeError;
      if(data?.error)throw new Error(data.error);
      setMessage("Cuenta creada correctamente. El cliente ya puede iniciar sesión.");
      setEmail("");setName("");setPassword("");setShowCreate(false);window.location.reload();
    }catch(e){setError(e instanceof Error?e.message:"No se pudo crear la cuenta.");}
    finally{setBusy(false);}
  }

  async function updatePlan(customerId:string,planType:string,limit:number){
    setBusy(true);setError("");setMessage("");
    const existing=planMap.get(customerId);
    const {error}=await supabase.from("customer_plans").upsert({
      user_id:customerId,plan_type:planType,monthly_activation_limit:planType==="premium"?0:Math.max(0,limit),
      monthly_activation_count:existing?.monthly_activation_count??0,
      counter_month: new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10),
      expires_at:existing?.expires_at??null
    });
    if(error)setError(error.message);else{setMessage("Plan y límite actualizados.");window.location.reload();}
    setBusy(false);
  }

  async function toggleAccount(customer:Customer){
    setBusy(true);setError("");setMessage("");
    const next=customer.account_status==="active"?"suspended":"active";
    const {error}=await supabase.from("profiles").update({account_status:next}).eq("id",customer.id);
    if(error)setError(error.message);else{setMessage("Estado de la cuenta actualizado.");window.location.reload();}
    setBusy(false);
  }

  async function deleteSource(id:string){
    if(!window.confirm("¿Eliminar esta lista del cliente? Esta acción no se puede deshacer."))return;
    setBusy(true);setError("");setMessage("");
    const {error}=await supabase.from("iptv_sources").delete().eq("id",id);
    if(error)setError(error.message);else{setMessage("Lista eliminada.");window.location.reload();}
    setBusy(false);
  }

  async function revokeDevice(id:string){
    if(!window.confirm("¿Revocar este dispositivo?"))return;
    setBusy(true);setError("");setMessage("");
    const {error}=await supabase.from("devices").update({status:"revoked",revoked_at:new Date().toISOString()}).eq("id",id);
    if(error)setError(error.message);else{setMessage("Dispositivo revocado.");window.location.reload();}
    setBusy(false);
  }

  return <main className="admin-page">
    <header className="admin-header">
      <Link className="brand" href="/"><span className="brand-mark">M</span><span><strong>MASTER</strong><small>IPTV PLAYER</small></span></Link>
      <div className="admin-header-actions"><span className="admin-live-dot">● Administrador</span><Link className="admin-back" href="/">← Panel de cliente</Link></div>
    </header>
    <div className="admin-content">
      <div className="eyebrow">CENTRO DE CONTROL · MASTER IPTV PLAYER</div>
      <div className="admin-title-row"><div><h1>Panel de <span>administración</span></h1><p className="subtitle">Gestiona clientes, planes, listas y dispositivos desde un solo lugar.</p></div><button className="admin-primary" onClick={()=>setShowCreate(v=>!v)}>＋ Crear cliente</button></div>
      {error&&<div className="form-alert error">{error}</div>}{message&&<div className="form-alert success">{message}</div>}

      {showCreate&&<section className="admin-section admin-create-card"><div className="admin-section-head"><div><h2>Crear cuenta de cliente</h2><p>La cuenta se activa al crearla y el cliente puede iniciar sesión inmediatamente.</p></div><button className="admin-close" onClick={()=>setShowCreate(false)}>×</button></div>
        <form className="admin-create-form" onSubmit={createCustomer}>
          <label>Nombre<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Nombre del cliente"/></label>
          <label>Correo electrónico<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="cliente@correo.com"/></label>
          <label>Contraseña inicial<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required placeholder="Mínimo 8 caracteres"/></label>
          <label>Plan<select value={newPlan} onChange={e=>setNewPlan(e.target.value)}><option value="free">Gratis</option><option value="premium">Premium</option></select></label>
          {newPlan==="free"&&<label>Límite de activaciones al mes<input type="number" min="0" max="1000" value={newLimit} onChange={e=>setNewLimit(e.target.value)}/></label>}
          <button className="admin-primary" disabled={busy}>{busy?"Creando…":"Crear cuenta y activar"}</button>
        </form>
      </section>}

      <section className="admin-metrics">
        <article className="stat-card"><div className="stat-note">CLIENTES REGISTRADOS</div><div className="stat-value">{customers.length}</div></article>
        <article className="stat-card"><div className="stat-note">DISPOSITIVOS ACTIVOS</div><div className="stat-value">{devices.filter(d=>d.status==="active").length}</div></article>
        <article className="stat-card"><div className="stat-note">CLIENTES PREMIUM</div><div className="stat-value">{plans.filter(p=>p.plan_type==="premium").length}</div></article>
      </section>

      <section className="admin-section">
        <div className="admin-section-head admin-search-head"><div><h2>Clientes</h2><p>Modifica planes, límites y estado de cada cuenta.</p></div><input className="admin-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre o correo…"/></div>
        <div className="admin-customer-list">
          {filtered.map(c=>{
            const p=planMap.get(c.id);
            const cs=sources.filter(s=>s.user_id===c.id);
            const ds=devices.filter(d=>d.user_id===c.id);
            return <article className="admin-customer-card" key={c.id}>
              <div className="admin-customer-top"><div><strong>{c.display_name||"Cliente"}</strong><small>{c.email}</small><small>Registro: {date(c.created_at)}</small></div><span className={c.account_status==="active"?"status-pill good":"status-pill bad"}>{c.account_status==="active"?"Activo":"Suspendido"}</span></div>
              <div className="admin-customer-controls">
                <label>Plan<select defaultValue={p?.plan_type??"free"} id={"plan-"+c.id}><option value="free">Gratis</option><option value="premium">Premium</option></select></label>
                <label>Activaciones / mes<input type="number" min="0" max="1000" defaultValue={p?.monthly_activation_limit??3} id={"limit-"+c.id} disabled={p?.plan_type==="premium"}/></label>
                <div className="admin-usage"><small>Uso este mes</small><strong>{p?.plan_type==="premium"?"Ilimitadas":(p?.monthly_activation_count??0)+" / "+(p?.monthly_activation_limit??3)}</strong></div>
                <button className="admin-small-primary" disabled={busy} onClick={()=>{const plan=(document.getElementById("plan-"+c.id) as HTMLSelectElement).value;const limit=Number((document.getElementById("limit-"+c.id) as HTMLInputElement).value);void updatePlan(c.id,plan,limit)}}>Guardar plan</button>
                <button className={c.account_status==="active"?"admin-small-danger":"admin-small-primary"} disabled={busy} onClick={()=>void toggleAccount(c)}>{c.account_status==="active"?"Suspender":"Reactivar"}</button>
              </div>
              <div className="admin-customer-details">
                <details><summary>Listas del cliente ({cs.length})</summary>{cs.length===0?<p className="admin-empty">Sin listas guardadas.</p>:cs.map(s=><div className="admin-resource" key={s.id}><span><strong>{s.label}</strong><small>{s.source_type} · {date(s.created_at)}</small></span><button className="admin-small-danger" disabled={busy} onClick={()=>void deleteSource(s.id)}>Eliminar</button></div>)}</details>
                <details><summary>Dispositivos ({ds.length})</summary>{ds.length===0?<p className="admin-empty">Sin dispositivos registrados.</p>:ds.map(d=><div className="admin-resource" key={d.id}><span><strong>{d.device_name||"Dispositivo"}</strong><small>{d.platform} · {d.status} · {date(d.last_seen_at??d.activated_at)}</small></span>{d.status==="active"&&<button className="admin-small-danger" disabled={busy} onClick={()=>void revokeDevice(d.id)}>Revocar</button>}</div>)}</details>
              </div>
            </article>
          })}
          {filtered.length===0&&<div className="empty-state">No hay clientes que coincidan con la búsqueda.</div>}
        </div>
      </section>

      <section className="admin-section"><div className="admin-section-head"><div><h2>Actividad reciente</h2><p>Últimos movimientos de activación registrados.</p></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Evento</th><th>Cliente</th><th>Fecha</th></tr></thead><tbody>{events.map(e=><tr key={e.id}><td><span className="table-pill">{e.event_type}</span></td><td>{customers.find(c=>c.id===e.user_id)?.email??e.user_id}</td><td>{date(e.created_at)}</td></tr>)}{events.length===0&&<tr><td colSpan={3}>Todavía no hay eventos.</td></tr>}</tbody></table></div>
      </section>
      <div className="notice"><span>i</span><p><strong>Seguridad:</strong> las contraseñas nunca se muestran en el panel. Las credenciales privadas de M3U y Xtream tampoco se revelan; el administrador puede eliminar las listas, pero no leer sus secretos.</p></div>
    </div>
  </main>;
}
