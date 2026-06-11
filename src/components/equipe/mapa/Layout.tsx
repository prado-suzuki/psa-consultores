import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MapaClusterProvider } from '@/contexts/MapaClusterContext';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { useClusterFiltroOpcoes } from '@/hooks/useClusters';
import Select from './Select';

export const MAPA_BASE = '/equipe/digital/mapa';

const icons: Record<string, React.ReactNode> = {
  [`${MAPA_BASE}`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  [`${MAPA_BASE}/sistemas`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  [`${MAPA_BASE}/documentos`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  [`${MAPA_BASE}/processos`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  [`${MAPA_BASE}/cascata`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><line x1="7" y1="6" x2="17" y2="6"/><line x1="6" y1="8" x2="11" y2="16"/><line x1="18" y1="8" x2="13" y2="16"/></svg>,
  [`${MAPA_BASE}/responsaveis`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  [`${MAPA_BASE}/gargalos`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  [`${MAPA_BASE}/melhorias`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  [`${MAPA_BASE}/dashboard-roi`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  [`${MAPA_BASE}/setor-evolucao`]: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>,
};

const cadastrosIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;

const titles: Record<string, string> = {
  [`${MAPA_BASE}`]: 'Projetos',
  [`${MAPA_BASE}/sistemas`]: 'Sistemas',
  [`${MAPA_BASE}/documentos`]: 'Documentos',
  [`${MAPA_BASE}/processos`]: 'Processos',
  [`${MAPA_BASE}/cascata`]: 'Cascata',
  [`${MAPA_BASE}/responsaveis`]: 'Responsáveis',
  [`${MAPA_BASE}/gargalos`]: 'Gargalos',
  [`${MAPA_BASE}/melhorias`]: 'Melhorias',
  [`${MAPA_BASE}/dashboard-roi`]: 'Dashboard ROI',
  [`${MAPA_BASE}/setor-evolucao`]: 'Evolução do Setor',
};

// Links agrupados: cadastros vivem num card colapsável "Cadastros".
const linksPrincipais = [
  { to: MAPA_BASE,                label: 'Projetos', end: true },
  { to: `${MAPA_BASE}/processos`, label: 'Processos' },
];
const linksCadastros = [
  { to: `${MAPA_BASE}/responsaveis`, label: 'Responsáveis' },
  { to: `${MAPA_BASE}/documentos`,   label: 'Documentos' },
  { to: `${MAPA_BASE}/sistemas`,     label: 'Sistemas' },
  { to: `${MAPA_BASE}/gargalos`,     label: 'Gargalos' },
  { to: `${MAPA_BASE}/melhorias`,    label: 'Melhorias' },
];
const linksStandalone = [
  { to: `${MAPA_BASE}/cascata`, label: 'Cascata' },
];
const linksDashboards = [
  { to: `${MAPA_BASE}/dashboard-roi`,  label: 'Dashboard ROI' },
  { to: `${MAPA_BASE}/setor-evolucao`, label: 'Evolução do Setor' },
];

/** Seletor global de cluster — filtra todas as páginas do MAPA. */
function HeaderClusterSelect() {
  const { cluster, setCluster } = useClusterGlobal();
  const opcoes = useClusterFiltroOpcoes();
  return (
    <div className="header-cluster">
      <Select
        id="cluster-global"
        value={cluster}
        onChange={setCluster}
        options={opcoes}
        compact
        ariaLabel="Filtrar todas as páginas por cluster"
        style={{ minWidth: 200 }}
      />
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebarCollapsed') === '1';
  });
  const rotaEmCadastros = linksCadastros.some((l) => location.pathname.startsWith(l.to));
  const [cadastrosOpen, setCadastrosOpen] = useState<boolean>(() => {
    return localStorage.getItem('mapaCadastrosOpen') === '1';
  });
  const toggleCadastros = () => {
    setCadastrosOpen((o) => {
      const next = !o;
      localStorage.setItem('mapaCadastrosOpen', next ? '1' : '0');
      return next;
    });
  };
  // Garante o grupo aberto quando o usuário navega (ou chega por URL) a uma página de cadastro.
  useEffect(() => {
    if (rotaEmCadastros) setCadastrosOpen(true);
  }, [rotaEmCadastros]);
  const pageTitle = titles[location.pathname] || 'Mapeamento';

  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapsed = () => {
    setSidebarCollapsed((c) => {
      const next = !c;
      localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  };

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    return () => { document.body.classList.remove('sidebar-collapsed'); };
  }, [sidebarCollapsed]);

  return (
    <MapaClusterProvider>
    <div className={`app-root${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Abrir menu"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((s) => !s)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      <div className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`} onClick={closeSidebar} />

      <nav className={`sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src="/favicon.png" alt="" className="sidebar-logo-icon" aria-hidden="true" />
          <span className="sidebar-logo-text">PSA Consultores</span>
        </div>
        <ul className="sidebar-menu">
          {linksPrincipais.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} onClick={closeSidebar} title={l.label}>
                {icons[l.to]}
                <span className="sidebar-label">{l.label}</span>
              </NavLink>
            </li>
          ))}
          <li className={`sidebar-group${rotaEmCadastros ? ' has-active' : ''}`}>
            <button
              type="button"
              className="sidebar-group-toggle"
              onClick={toggleCadastros}
              aria-expanded={cadastrosOpen}
              title="Cadastros"
            >
              {cadastrosIcon}
              <span className="sidebar-label">Cadastros</span>
              <svg className={`sidebar-group-caret${cadastrosOpen ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {cadastrosOpen && (
              <ul className="sidebar-submenu">
                {linksCadastros.map((l) => (
                  <li key={l.to}>
                    <NavLink to={l.to} onClick={closeSidebar} title={l.label}>
                      {icons[l.to]}
                      <span className="sidebar-label">{l.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
          {linksStandalone.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} onClick={closeSidebar} title={l.label}>
                {icons[l.to]}
                <span className="sidebar-label">{l.label}</span>
              </NavLink>
            </li>
          ))}
          {linksDashboards.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} onClick={closeSidebar} title={l.label}>
                {icons[l.to]}
                <span className="sidebar-label">{l.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-action-btn"
            onClick={() => { closeSidebar(); navigate('/equipe/digital'); }}
            aria-label="Trocar área"
            title="Trocar área"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span className="sidebar-label">Trocar área</span>
          </button>
          <button
            type="button"
            className="sidebar-action-btn"
            onClick={() => { closeSidebar(); navigate('/'); }}
            aria-label="Voltar ao site"
            title="Voltar ao site"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span className="sidebar-label">Voltar ao site</span>
          </button>
          <button
            type="button"
            className="sidebar-action-btn"
            onClick={toggleCollapsed}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'}
            title={sidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarCollapsed
                ? <polyline points="9 18 15 12 9 6"/>
                : <polyline points="15 18 9 12 15 6"/>}
            </svg>
            <span className="sidebar-label">{sidebarCollapsed ? 'Expandir' : 'Minimizar'}</span>
          </button>
        </div>
      </nav>

      <div className="main-content">
        <header>
          <div className="page-title">{pageTitle}</div>
          <div className="header-right">
            <HeaderClusterSelect />
            <div className="header-status">
              <span className="status-dot" aria-hidden="true" />
              Status: <span className="status-label">Online</span>
            </div>
          </div>
        </header>
        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
    </MapaClusterProvider>
  );
}
