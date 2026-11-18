"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  displayName: string;
  planType: string;
  activationCount: number;
  activationLimit: number;
  sourceCount: number;
  deviceCount: number;
  accountStatus: string;
  isAdmin: boolean;
};

const menu = [
  { icon: "⌂", label: "Resumen", href: "/" },
  { icon: "▤", label: "Mis listas", href: "/lists" },
  { icon: "▣", label: "Dispositivos", href: "/devices" },
  { icon: "◷", label: "Activaciones", href: "/activations" },
  { icon: "⚙", label: "Mi cuenta", href: "/account" },
  { icon: "✦", label: "Plan Premium", href: "/premium" },
];

export default function Dashboard(props: Props) {
  const router = useRouter();
  const premium = props.planType === "premium";
  const initials = props.displayName.trim().slice(0, 2).toUpperCase() || "MP";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span>
          <span><strong>MASTER</strong><small>IPTV PLAYER</small></span>
        </Link>
        <div className="workspace-label">ESPACIO PERSONAL</div>
        <nav className="nav-list" aria-label="Navegación principal">
          {menu.map((item, index) => (
            <Link key={item.label} className={index === 0 ? "nav-item active" : "nav-item"} href={item.href}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </Link>
          ))}
          {props.isAdmin && <Link className="nav-item admin-nav" href="/admin"><span className="nav-icon">◆</span>Administración</Link>}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">?</span>
            <strong>¿Necesitas ayuda?</strong>
            <p>Pronto encontrarás aquí guías para conectar tus listas y dispositivos.</p>
          </div>
          <div className="profile-mini">
            <div className="avatar">{initials}</div>
            <div><strong>{props.displayName}</strong><small>{premium ? "Plan Premium" : "Plan gratuito"}</small></div>
            <button className="signout-mini" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión">↗</button>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Panel de cliente <span>/</span> Resumen</div>
          <div className="topbar-right"><span className="status-dot" /> Cuenta conectada <div className="top-avatar">{initials}</div></div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">TU CENTRO DE ENTRETENIMIENTO</div>
              <h1>Bienvenido, <span>{props.displayName}</span></h1>
              <p className="subtitle">Administra tus listas y conecta tus dispositivos desde un solo lugar.</p>
            </div>
            <div className="welcome-badge"><span>✦</span> {premium ? "PLAN PREMIUM" : "PLAN GRATUITO"}</div>
          </div>

          {props.accountStatus !== "active" && <div className="form-alert error">Tu cuenta está suspendida. Contacta con el administrador.</div>}

          <section className="stats-grid" aria-label="Resumen de cuenta">
            <article className="stat-card"><div className="stat-top"><span>Listas IPTV</span><span className="stat-icon">▤</span></div><div className="stat-value">{props.sourceCount}</div><div className="stat-note">M3U y Xtream Codes</div></article>
            <article className="stat-card"><div className="stat-top"><span>Dispositivos activos</span><span className="stat-icon">▣</span></div><div className="stat-value">{props.deviceCount}</div><div className="stat-note">TV, TV Box y móviles</div></article>
            <article className="stat-card"><div className="stat-top"><span>Activaciones del mes</span><span className="stat-icon">◷</span></div><div className="stat-value">{premium ? "∞" : props.activationCount + " / " + props.activationLimit}</div><div className="stat-note">{premium ? "Activaciones ilimitadas" : "Límite mensual de tu plan"}</div></article>
          </section>

          <section className="section-heading"><div><h2>Tu espacio de trabajo</h2><p>Las herramientas de tu cuenta estarán disponibles aquí.</p></div></section>
          <section className="action-grid">
            <article className="action-card featured"><div className="action-icon">＋</div><div className="card-kicker">MIS CONTENIDOS</div><h3>Conecta tu primera lista</h3><p>Agrega un enlace M3U, sube un archivo o conecta tu cuenta Xtream Codes.</p><Link className="action-link" href="/lists">Abrir mis listas <span>→</span></Link></article>
            <article className="action-card"><div className="action-icon">▣</div><div className="card-kicker">TUS EQUIPOS</div><h3>Vincula tu dispositivo</h3><p>Usa el código que aparecerá en tu TV o escanea un código QR.</p><Link className="action-link" href="/devices">Vincular dispositivo <span>→</span></Link></article>
            <article className="action-card"><div className="action-icon">◷</div><div className="card-kicker">TU CUENTA</div><h3>Consulta tus activaciones</h3><p>Revisa el consumo de tu plan y el historial de tus dispositivos.</p><Link className="action-link" href="/activations">Ver activaciones <span>→</span></Link></article>
          </section>

          <div className="account-strip"><div><strong>Sesión iniciada</strong><span>{props.email}</span></div><button onClick={signOut}>Cerrar sesión</button></div>
          <div className="notice"><span>i</span><p><strong>Panel conectado.</strong> Tu sesión y los datos básicos de tu cuenta ya se consultan desde Supabase. Ya puedes administrar tus listas, generar códigos temporales de vinculación y consultar los datos de tu cuenta.</p></div>
          <footer>MASTER IPTV PLAYER <span>•</span> CONTROL TOTAL DE TU ENTRETENIMIENTO</footer>
        </div>
      </section>
    </main>
  );
}
