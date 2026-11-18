"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Source = { id:string; label:string; source_type:string; created_at:string };
type Device = { id:string; device_name:string; platform:string; status:string; source_id:string|null; activated_at:string|null; last_seen_at:string|null; created_at:string };
type Event = { id:string; event_type:string; details:unknown; created_at:string };
type Props = {
  section:"lists"|"devices"|"activations"|"account";
  email:string;
  sources?:Source[];
  devices?:Device[];
  events?:Event[];
  profile?:{display_name:string|null;email:string;account_status:string;created_at:string}|null;
  plan?:{plan_type:string;monthly_activation_limit:number;monthly_activation_count:number;expires_at:string|null}|null;
  initialCode?:string;
};

const titles = {
  lists:["Mis listas IPTV","Agrega y organiza tus fuentes M3U o Xtream Codes."],
  devices:["Mis dispositivos","Activa una lista en tu TV, TV Box o teléfono con un código o QR."],
  activations:["Historial de activaciones","Consulta los movimientos recientes de tus dispositivos."],
  account:["Mi cuenta","Consulta el estado de tu cuenta y tu plan actual."]
};

function date(value?:string|null) {
  if(!value) return "—";
  return new Date(value).toLocaleString("es-HN",{dateStyle:"medium",timeStyle:"short"});
}

export default function PortalPage(props:Props) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [kind,setKind]=useState<"m3u_url"|"m3u_file"|"xtream">("m3u_url");
  const [label,setLabel]=useState("");
  const [url,setUrl]=useState("");
  const [server,setServer]=useState("");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [pairCode,setPairCode]=useState(props.initialCode ?? "");
  const [selectedSource,setSelectedSource]=useState(props.sources?.[0]?.id ?? "");

  async function signOut(){
    const supabase=createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function saveSource(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setNotice("");
    try{
      let content="";
      if(kind==="m3u_file"){
        if(!file) throw new Error("Selecciona un archivo M3U.");
        if(file.size>8*1024*1024) throw new Error("El archivo supera el límite de 8 MB.");
        content=await file.text();
      }
      const response=await fetch("/api/sources",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        label,sourceType:kind,url,server,username,password,content
      })});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"No se pudo guardar la lista.");
      setNotice("Lista guardada y protegida correctamente.");
      setLabel("");setUrl("");setServer("");setUsername("");setPassword("");setFile(null);
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Error al guardar.");}
    finally{setBusy(false);}
  }

  async function checkSource(id:string){setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/sources/check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceId:id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudo comprobar.");setNotice(d.check.status==="ok"?"La lista respondió correctamente.":"La lista presenta un problema: "+d.check.message);}catch(e){setError(e instanceof Error?e.message:"Error de comprobación.");}finally{setBusy(false);}}

  async function deleteSource(id:string){
    if(!window.confirm("¿Seguro que deseas eliminar esta lista?")) return;
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/sources",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"No se pudo eliminar.");
      setNotice("Lista eliminada.");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Error al eliminar.");}
    finally{setBusy(false);}
  }

  async function claimDevice(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/devices/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:pairCode,sourceId:selectedSource})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"No se pudo vincular el dispositivo.");
      setNotice(result.message||"Solicitud enviada. La TV cargará tu lista en unos segundos.");
      setPairCode("");
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Error al vincular el dispositivo.");}
    finally{setBusy(false);}
  }

  async function manageDevice(deviceId:string,sourceId:string,deviceName:string){setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/devices/manage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId,sourceId,deviceName})});const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudo actualizar.");setNotice("Dispositivo actualizado.");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Error al actualizar.");}finally{setBusy(false);}}\n\n  async function revokeDevice(id:string){
    if(!window.confirm("¿Desactivar este dispositivo?")) return;
    setBusy(true);setError("");setNotice("");
    const supabase=createClient();
    const {error}=await supabase.from("devices").update({status:"revoked",revoked_at:new Date().toISOString()}).eq("id",id);
    if(error)setError(error.message);else{setNotice("Dispositivo desactivado.");router.refresh();}
    setBusy(false);
  }

  const [title,subtitle]=titles[props.section];

  return <main className="portal-shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><img className="brand-logo" src="/master-logo.svg" alt="Master IPTV Player" /><span><strong>MASTER</strong><small>IPTV PLAYER</small></span></Link>
      <div className="workspace-label">ESPACIO PERSONAL</div>
      <nav className="nav-list" aria-label="Navegación principal">
        <Link className={props.section==="lists"?"nav-item":"nav-item"} href="/"><span className="nav-icon">⌂</span>Resumen</Link>
        <Link className={props.section==="lists"?"nav-item active":"nav-item"} href="/lists"><span className="nav-icon">▤</span>Mis listas</Link>
        <Link className={props.section==="devices"?"nav-item active":"nav-item"} href="/devices"><span className="nav-icon">▣</span>Dispositivos</Link>
        <Link className={props.section==="activations"?"nav-item active":"nav-item"} href="/activations"><span className="nav-icon">◷</span>Activaciones</Link>
        <Link className={props.section==="account"?"nav-item active":"nav-item"} href="/account"><span className="nav-icon">⚙</span>Mi cuenta</Link>\n        <Link className="nav-item" href="/notifications"><span className="nav-icon">◉</span>Notificaciones</Link>\n        <Link className="nav-item" href="/support"><span className="nav-icon">?</span>Soporte</Link>
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">?</span><strong>¿Necesitas ayuda?</strong><p>Usa listas y contenido que tengas autorización para utilizar.</p></div><div className="profile-mini"><div className="avatar">MP</div><div><strong>Mi cuenta</strong><small>{props.email}</small></div><button className="signout-mini" onClick={signOut} title="Cerrar sesión">↗</button></div></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div className="breadcrumb"><Link href="/">Panel de cliente</Link><span>/</span>{title}</div><div className="topbar-right"><span className="status-dot"/> Cuenta conectada</div></header>
      <div className="portal-content">
        <div className="eyebrow">MASTER IPTV PLAYER · ÁREA PERSONAL</div>
        <div className="portal-heading"><div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div><Link className="portal-back" href="/">← Volver al resumen</Link></div>
        {error&&<div className="form-alert error portal-alert">{error}</div>}
        {notice&&<div className="form-alert success portal-alert">{notice}</div>}

        {props.section==="lists"&&<>
          <section className="portal-card">
            <h2>Agregar una lista</h2><p className="portal-muted">Puedes usar un enlace M3U, cargar un archivo M3U o conectar Xtream Codes. Los datos de acceso se guardan cifrados.</p>
            <div className="portal-tabs">
              <button type="button" className={kind==="m3u_url"?"selected":""} onClick={()=>setKind("m3u_url")}>Enlace M3U</button>
              <button type="button" className={kind==="m3u_file"?"selected":""} onClick={()=>setKind("m3u_file")}>Archivo M3U</button>
              <button type="button" className={kind==="xtream"?"selected":""} onClick={()=>setKind("xtream")}>Xtream Codes</button>
            </div>
            <form className="portal-form" onSubmit={saveSource}>
              <label>Nombre para identificarla<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Mi lista principal" required maxLength={80}/></label>
              {kind==="m3u_url"&&<label>Enlace M3U<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://servidor/lista.m3u" required/></label>}
              {kind==="m3u_file"&&<label>Archivo M3U<input type="file" accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)} required/><small>Máximo 8 MB. El archivo se cifra antes de guardarse.</small></label>}
              {kind==="xtream"&&<><label>URL del servidor<input type="url" value={server} onChange={e=>setServer(e.target.value)} placeholder="http://servidor:puerto" required/></label><div className="portal-two-col"><label>Usuario<input value={username} onChange={e=>setUsername(e.target.value)} required/></label><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password"/></label></div></>}
              <button className="primary-action" disabled={busy}>{busy?"Guardando…":"Guardar lista"} <span>→</span></button>
            </form>
          </section>
          <section className="portal-card"><div className="portal-card-heading"><div><h2>Mis listas guardadas</h2><p className="portal-muted">Tus datos privados no se muestran en esta tabla.</p></div><span className="count-pill">{props.sources?.length??0} listas</span></div>
            {(props.sources??[]).length===0?<div className="empty-state">Todavía no agregaste ninguna lista.</div>:<div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{props.sources?.map(s=><tr key={s.id}><td>{s.label}</td><td>{s.source_type==="xtream"?"Xtream Codes":s.source_type==="m3u_file"?"Archivo M3U":"Enlace M3U"}</td><td>{date(s.created_at)}</td><td><button className="secondary-action" onClick={()=>checkSource(s.id)} disabled={busy}>Comprobar</button><button className="danger-action" onClick={()=>deleteSource(s.id)} disabled={busy}>Eliminar</button></td></tr>)}</tbody></table></div>}
          </section>
        </>}

        {props.section==="devices"&&<>
          <section className="portal-card"><h2>Activar un dispositivo</h2><p className="portal-muted">Abre Master IPTV Player en tu TV. En pantalla aparecerá un código y un QR. Escribe el código aquí o escanea el QR con la cámara de tu teléfono. Después elige qué lista quieres enviar a ese equipo.</p>
            {(props.sources??[]).length===0?<div className="empty-state">Primero agrega tus listas en <Link href="/lists">Mis listas</Link>. Luego podrás elegir cuál activar en cada dispositivo.</div>:<form className="portal-form" onSubmit={claimDevice}>
              <label>Código que aparece en la TV<input inputMode="numeric" autoComplete="one-time-code" value={pairCode} onChange={e=>setPairCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" required minLength={6} maxLength={6}/></label>
              <label>Lista que quieres activar en este dispositivo<select value={selectedSource} onChange={e=>setSelectedSource(e.target.value)} required>{props.sources?.map(s=><option key={s.id} value={s.id}>{s.label} · {s.source_type==="xtream"?"Xtream Codes":s.source_type==="m3u_file"?"Archivo M3U":"Enlace M3U"}</option>)}</select></label>
              <button className="primary-action" disabled={busy||pairCode.length!==6||!selectedSource}>{busy?"Vinculando…":"Activar esta lista en mi dispositivo"} <span>→</span></button>
            </form>}
          </section>
          <section className="portal-card"><div className="portal-card-heading"><h2>Dispositivos vinculados</h2><span className="count-pill">{props.devices?.length??0}</span></div>
            {(props.devices??[]).length===0?<div className="empty-state">Todavía no hay dispositivos vinculados.</div>:<div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Dispositivo</th><th>Plataforma</th><th>Estado</th><th>Última actividad</th><th>Lista asignada</th><th></th></tr></thead><tbody>{props.devices?.map(d=><tr key={d.id}><td>{d.device_name}</td><td>{d.platform}</td><td><span className={d.status==="active"?"status-pill good":"status-pill"}>{d.status}</span></td><td>{date(d.last_seen_at??d.activated_at)}</td><td>{d.status==="active"?<div className="portal-two-col"><select aria-label="Lista asignada" defaultValue={d.source_id??""} id={"device-source-"+d.id}>{props.sources?.map(src=><option key={src.id} value={src.id}>{src.label}</option>)}</select><button className="secondary-action" disabled={busy} onClick={()=>manageDevice(d.id,(document.getElementById("device-source-"+d.id) as HTMLSelectElement).value,d.device_name)}>Cambiar</button></div>:"—"}</td><td>{d.status==="active"&&<button className="danger-action" onClick={()=>revokeDevice(d.id)} disabled={busy}>Desactivar</button>}</td></tr>)}</tbody></table></div>}
          </section>
        </>}

        {props.section==="activations"&&<section className="portal-card"><h2>Actividad de tu cuenta</h2><p className="portal-muted">Aquí aparecen los eventos que el sistema registre.</p>
          {(props.events??[]).length===0?<div className="empty-state">Todavía no hay activaciones registradas. Cuando vincules dispositivos, el historial aparecerá aquí.</div>:<div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Evento</th><th>Fecha</th><th>Detalle</th></tr></thead><tbody>{props.events?.map(ev=><tr key={ev.id}><td>{ev.event_type}</td><td>{date(ev.created_at)}</td><td>{typeof ev.details==="object"&&ev.details?JSON.stringify(ev.details):"—"}</td></tr>)}</tbody></table></div>}
        </section>}

        {props.section==="account"&&<section className="portal-card"><h2>Información de la cuenta</h2><div className="account-details"><div><small>NOMBRE</small><strong>{props.profile?.display_name??"Cliente"}</strong></div><div><small>CORREO</small><strong>{props.profile?.email??props.email}</strong></div><div><small>ESTADO</small><strong>{props.profile?.account_status??"Activo"}</strong></div><div><small>PLAN</small><strong>{props.plan?.plan_type==="premium"?"Premium":"Gratuito"}</strong></div><div><small>ACTIVACIONES DEL MES</small><strong>{props.plan?.plan_type==="premium"?"Ilimitadas":(props.plan?.monthly_activation_count??0)+" / "+(props.plan?.monthly_activation_limit??3)}</strong></div><div><small>VENCIMIENTO</small><strong>{date(props.plan?.expires_at)}</strong></div><div><small>MIEMBRO DESDE</small><strong>{date(props.profile?.created_at)}</strong></div></div><button className="secondary-action" onClick={signOut}>Cerrar sesión</button></section>}

        <footer>MASTER IPTV PLAYER <span>•</span> CONTROL TOTAL DE TU ENTRETENIMIENTO</footer>
      </div>
    </section>
  </main>;
}
