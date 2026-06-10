// Roteamento interno do módulo MAPA (Mapeamento de Processos OSG).
// Montado em /equipe/digital/mapa/* via App.tsx. Cada subrota é gateada
// individualmente em src/config/protectedPages.ts.

import { Routes, Route } from 'react-router-dom';
import { PageAccessGate } from '@/components/auth/PageAccessGate';
import MapaLayout from '@/components/equipe/mapa/Layout';
import './mapa.css';
import './styles/roi.css';
import ProjetosPage from '@/pages/equipe/mapa/ProjetosPage';
import SistemasPage from '@/pages/equipe/mapa/SistemasPage';
import DocumentosPage from '@/pages/equipe/mapa/DocumentosPage';
import ProcessosPage from '@/pages/equipe/mapa/ProcessosPage';
import MapearProcessoPage from '@/pages/equipe/mapa/MapearProcessoPage';
import CascataPage from '@/pages/equipe/mapa/CascataPage';
import ResponsaveisPage from '@/pages/equipe/mapa/ResponsaveisPage';
import GargalosPage from '@/pages/equipe/mapa/GargalosPage';
import MelhoriasPage from '@/pages/equipe/mapa/MelhoriasPage';
import DashboardRoiPage from '@/pages/equipe/mapa/DashboardRoiPage';
import SetorEvolucaoPage from '@/pages/equipe/mapa/SetorEvolucaoPage';

export default function MapaRoutes() {
  return (
    <Routes>
      <Route element={<MapaLayout />}>
        <Route index element={<PageAccessGate pagePath="/equipe/digital/mapa"><ProjetosPage /></PageAccessGate>} />
        <Route path="processos" element={<PageAccessGate pagePath="/equipe/digital/mapa/processos"><ProcessosPage /></PageAccessGate>} />
        <Route path="processos/:id/mapear" element={<PageAccessGate pagePath="/equipe/digital/mapa/processos/:id/mapear"><MapearProcessoPage /></PageAccessGate>} />
        <Route path="cascata" element={<PageAccessGate pagePath="/equipe/digital/mapa/cascata"><CascataPage /></PageAccessGate>} />
        <Route path="documentos" element={<PageAccessGate pagePath="/equipe/digital/mapa/documentos"><DocumentosPage /></PageAccessGate>} />
        <Route path="sistemas" element={<PageAccessGate pagePath="/equipe/digital/mapa/sistemas"><SistemasPage /></PageAccessGate>} />
        <Route path="responsaveis" element={<PageAccessGate pagePath="/equipe/digital/mapa/responsaveis"><ResponsaveisPage /></PageAccessGate>} />
        <Route path="gargalos" element={<PageAccessGate pagePath="/equipe/digital/mapa/gargalos"><GargalosPage /></PageAccessGate>} />
        <Route path="melhorias" element={<PageAccessGate pagePath="/equipe/digital/mapa/melhorias"><MelhoriasPage /></PageAccessGate>} />
        <Route path="dashboard-roi" element={<PageAccessGate pagePath="/equipe/digital/mapa/dashboard-roi"><DashboardRoiPage /></PageAccessGate>} />
        <Route path="setor-evolucao" element={<PageAccessGate pagePath="/equipe/digital/mapa/setor-evolucao"><SetorEvolucaoPage /></PageAccessGate>} />
      </Route>
    </Routes>
  );
}
