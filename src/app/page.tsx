const menu = [
  { icon: "⌂", label: "Resumen", active: true },
  { icon: "▤", label: "Mis listas" },
  { icon: "▣", label: "Dispositivos" },
  { icon: "◷", label: "Activaciones" },
  { icon: "⚙", label: "Mi cuenta" },
];

const stats = [
  { label: "Listas IPTV", value: "—", note: "M3U y Xtream Codes", icon: "▤" },
  { label: "Dispositivos activos", value: "—", note: "TV, TV Box y móviles", icon: "▣" },
  { label: "Activaciones del mes", value: "—", note: "Tu límite se mostrará aquí", icon: "◷" },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">M</span>
          <span><strong>MASTER</strong><small>IPTV PLAYER</small></span>
        </a>
        <div className="workspace-label">ESPACIO PERSONAL</div>
        <nav className="nav-list" aria-label="Navegación principal">
          {menu.map((item) => (
            <a key={item.label} className={item.active ? "nav-item active" : "nav-item"} href="#">
              <span className="nav-icon">{item.icon}</span>{item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">?</span>
            <strong>¿Necesitas ayuda?</strong>
            <p>Pronto encontrarás aquí guías para conectar tus listas y dispositivos.</p>
          </div>
          <div className="profile-mini">
            <div className="avatar">CM</div>
            <div><strong>Mi cuenta</strong><small>Plan gratuito</small></div>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Panel de cliente <span>/</span> Resumen</div>
          <div className="topbar-right"><span className="status-dot" /> Sistema preparado <div className="top-avatar">CM</div></div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">TU CENTRO DE ENTRETENIMIENTO</div>
              <h1>Bienvenido a <span>Master IPTV Player</span></h1>
              <p className="subtitle">Administra tus listas y conecta tus dispositivos desde un solo lugar.</p>
            </div>
            <div className="welcome-badge"><span>✦</span> EXPERIENCIA PREMIUM</div>
          </div>

          <section className="stats-grid" aria-label="Resumen de cuenta">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <div className="stat-top"><span>{stat.label}</span><span className="stat-icon">{stat.icon}</span></div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-note">{stat.note}</div>
              </article>
            ))}
          </section>

          <section className="section-heading">
            <div><h2>Comienza aquí</h2><p>Configura tu cuenta para empezar a disfrutar.</p></div>
          </section>

          <section className="action-grid">
            <article className="action-card featured">
              <div className="action-icon">＋</div>
              <div className="card-kicker">PASO 01</div>
              <h3>Conecta tu primera lista</h3>
              <p>Agrega un enlace M3U, sube un archivo o conecta tu cuenta Xtream Codes.</p>
              <button type="button" disabled>Próximamente <span>→</span></button>
            </article>
            <article className="action-card">
              <div className="action-icon">▣</div>
              <div className="card-kicker">PASO 02</div>
              <h3>Vincula tu dispositivo</h3>
              <p>Usa el código que aparecerá en tu TV o escanea un código QR.</p>
              <button type="button" disabled>Próximamente <span>→</span></button>
            </article>
            <article className="action-card">
              <div className="action-icon">◷</div>
              <div className="card-kicker">PASO 03</div>
              <h3>Revisa tus activaciones</h3>
              <p>Consulta el uso mensual de tu plan y el historial de tus dispositivos.</p>
              <button type="button" disabled>Próximamente <span>→</span></button>
            </article>
          </section>

          <div className="notice"><span>i</span><p><strong>Panel en construcción.</strong> Esta es la primera estructura visual. El registro, inicio de sesión, listas, activaciones y panel de administrador se conectarán en las siguientes etapas.</p></div>
          <footer>MASTER IPTV PLAYER <span>•</span> CONTROL TOTAL DE TU ENTRETENIMIENTO</footer>
        </div>
      </section>
    </main>
  );
}
