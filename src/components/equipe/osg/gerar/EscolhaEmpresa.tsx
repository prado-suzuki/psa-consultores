import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { iniciais } from '@/components/equipe/osg/quadro-societario/quadroFmt';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

const TIPO_EMPRESA_LABELS: Record<string, string> = {
  PR: 'Proprietária',
  CN: 'Controladora',
  SC: 'Sócia',
};

export interface EmpresaOpcao {
  id: string;
  row: PessoaRow;
}

interface EscolhaEmpresaProps {
  empresas: EmpresaOpcao[];
  empresaId: string | null;
  onEscolher: (id: string) => void;
  temCliente: boolean;
  carregando: boolean;
}

/**
 * Passo 2 do fluxo guiado: a empresa-alvo do contrato, em cards (avatar +
 * razão social + CNPJ + tipo). É a única decisão que o usuário precisa tomar —
 * sócios, administradores e integralizações carregam sozinhos dela.
 */
export const EscolhaEmpresa = ({
  empresas,
  empresaId,
  onEscolher,
  temCliente,
  carregando,
}: EscolhaEmpresaProps) => {
  const navigate = useNavigate();

  if (!temCliente) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-osg-200/70 bg-osg-50/50 p-3 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 shrink-0 text-osg-600" />
        Escolha primeiro o cliente na barra "Cliente", no topo da página.
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando empresas do cliente…
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Este cliente ainda não tem empresa (pessoa jurídica) cadastrada.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
        >
          Abrir Qualificação das Partes
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {empresas.map((e, i) => {
        const selecionada = e.id === empresaId;
        const tipo = e.row.tipo_empresa ? TIPO_EMPRESA_LABELS[e.row.tipo_empresa] : null;
        return (
          <button
            key={e.id}
            type="button"
            aria-pressed={selecionada}
            onClick={() => onEscolher(e.id)}
            className={cn(
              'group relative flex items-center gap-3.5 rounded-md border bg-card p-4 pl-5 text-left shadow-sm transition-all duration-200 animate-osg-card-in motion-reduce:animate-none',
              selecionada
                ? 'border-osg-moss/60 shadow-osg-300/40 ring-1 ring-osg-moss/25'
                : 'border-osg-300/60 shadow-osg-300/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-300/30',
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {selecionada && (
              <span
                aria-hidden
                className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full bg-osg-moss"
              />
            )}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-osg-moss/10 text-xs font-bold text-osg-700">
              {iniciais(e.row.denominacao)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {e.row.denominacao}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {e.row.cpf_cnpj && <span className="tabular-nums">{e.row.cpf_cnpj}</span>}
                {tipo && (
                  <span className="rounded-full bg-osg-moss/10 px-1.5 py-px text-[10px] font-semibold text-osg-moss">
                    {tipo}
                  </span>
                )}
              </span>
            </span>
            {selecionada && <CheckCircle2 className="h-4 w-4 shrink-0 text-osg-moss" />}
          </button>
        );
      })}
    </div>
  );
};
