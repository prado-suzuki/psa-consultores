/**
 * Pagina "Dashboards" do Estrategico (Digital Rotina).
 *
 * Ela nao conhece nenhum dashboard: le o catalogo de `registro.ts`, desenha o
 * seletor e monta o que estiver selecionado. Publicar um dashboard novo e uma
 * entrada no registro, nao uma alteracao aqui.
 *
 * O dashboard selecionado vive em `?painel=<id>`, separado dos filtros que
 * cada dashboard mantem por conta propria (`aba`, `periodo`, `usuario`...).
 * Trocar de dashboard descarta esses filtros, porque eles nao significam a
 * mesma coisa — ou nada — no dashboard seguinte.
 */
import { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DASHBOARDS, resolverDashboard } from './registro';

const PARAM_PAINEL = 'painel';

const DashboardFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
    Carregando dashboard…
  </div>
);

const Dashboards = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboard = resolverDashboard(searchParams.get(PARAM_PAINEL));
  const Componente = dashboard.componente;

  const trocarDashboard = (id: string) => {
    // Só o painel sobrevive à troca: os demais parâmetros são filtros do
    // dashboard anterior e não têm equivalente garantido no próximo.
    setSearchParams(new URLSearchParams({ [PARAM_PAINEL]: id }));
  };

  const seletor = (
    <Select value={dashboard.id} onValueChange={trocarDashboard}>
      <SelectTrigger
        className="h-9 w-[260px] bg-white text-sm"
        aria-label="Selecionar dashboard"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {DASHBOARDS.map((item) => (
          <SelectItem
            key={item.id}
            value={item.id}
            className="text-sm"
            onMouseEnter={() => void item.precarregar()}
            onFocus={() => void item.precarregar()}
          >
            <span className="flex items-center gap-2">
              <item.icone className="h-4 w-4 text-teal-600" aria-hidden="true" />
              {item.nome}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <EquipeLayout title={dashboard.nome} subtitle={dashboard.descricao} headerActions={seletor}>
      <Suspense fallback={<DashboardFallback />}>
        <Componente />
      </Suspense>
    </EquipeLayout>
  );
};

export default Dashboards;
