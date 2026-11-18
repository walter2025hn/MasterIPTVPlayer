import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/");

  const [{ data: customers }, { data: plans }, { data: events }] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name,account_status,created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("customer_plans").select("user_id,plan_type,monthly_activation_limit,monthly_activation_count,expires_at"),
    supabase.from("activation_events").select("id,user_id,event_type,created_at,details").order("created_at", { ascending: false }).limit(50),
  ]);

  const planByUser = new Map((plans ?? []).map((plan) => [plan.user_id, plan]));

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="brand" href="/"><span className="brand-mark">M</span><span><strong>MASTER</strong><small>IPTV PLAYER</small></span></Link>
        <Link className="admin-back" href="/">← Volver al panel</Link>
      </header>
      <div className="admin-content">
        <div className="eyebrow">CENTRO DE CONTROL</div>
        <h1>Panel de <span>administración</span></h1>
        <p className="subtitle">Vista protegida para administradores autorizados.</p>
        <section className="admin-metrics">
          <article className="stat-card"><div className="stat-note">CLIENTES REGISTRADOS</div><div className="stat-value">{customers?.length ?? 0}</div></article>
          <article className="stat-card"><div className="stat-note">EVENTOS RECIENTES</div><div className="stat-value">{events?.length ?? 0}</div></article>
          <article className="stat-card"><div className="stat-note">PLANES PREMIUM</div><div className="stat-value">{(plans ?? []).filter((plan) => plan.plan_type === "premium").length}</div></article>
        </section>

        <section className="admin-section">
          <div className="admin-section-head"><div><h2>Clientes</h2><p>Últimos 100 registros. No se muestran credenciales privadas de las listas.</p></div></div>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Cliente</th><th>Plan</th><th>Activaciones</th><th>Estado</th><th>Registro</th></tr></thead>
            <tbody>
              {(customers ?? []).map((customer) => {
                const plan = planByUser.get(customer.id);
                return <tr key={customer.id}>
                  <td><strong>{customer.display_name || "Sin nombre"}</strong><small>{customer.email}</small></td>
                  <td><span className="table-pill">{plan?.plan_type === "premium" ? "Premium" : "Gratis"}</span></td>
                  <td>{plan?.plan_type === "premium" ? "Ilimitadas" : (plan?.monthly_activation_count ?? 0) + " / " + (plan?.monthly_activation_limit ?? 3)}</td>
                  <td><span className={customer.account_status === "active" ? "status-pill good" : "status-pill bad"}>{customer.account_status}</span></td>
                  <td>{new Date(customer.created_at).toLocaleDateString("es-HN")}</td>
                </tr>;
              })}
              {(!customers || customers.length === 0) && <tr><td colSpan={5}>Todavía no hay clientes registrados.</td></tr>}
            </tbody>
          </table></div>
        </section>

        <section className="admin-section">
          <div className="admin-section-head"><div><h2>Actividad reciente</h2><p>Registro de activaciones y eventos de dispositivos.</p></div></div>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Evento</th><th>Usuario</th><th>Fecha</th></tr></thead>
            <tbody>
              {(events ?? []).map((event) => <tr key={event.id}><td><span className="table-pill">{event.event_type}</span></td><td><small>{event.user_id}</small></td><td>{new Date(event.created_at).toLocaleString("es-HN")}</td></tr>)}
              {(!events || events.length === 0) && <tr><td colSpan={3}>Todavía no hay eventos registrados.</td></tr>}
            </tbody>
          </table></div>
        </section>
        <div className="notice"><span>i</span><p><strong>Acceso restringido.</strong> Este panel solo reconoce cuentas con el rol admin asignado de forma segura en Supabase Auth app_metadata. El registro público no puede concederse ese rol.</p></div>
      </div>
    </main>
  );
}
