import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Plus, X } from 'lucide-react';
import { Campo, FieldSection, fieldCls } from '@/components/equipe/osg/formKit';
import { formGridCls, formSpanCls } from '@/lib/osgFormGrid';
import { FRACAO_STEP, clampFracaoInput } from '@/components/equipe/osg/diagnostico-patrimonial/fracaoUtils';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import {
  novaLinhaTitular,
  type TipoTitularidadeInicial,
  type TitularInicialDraft,
  type TitularesIniciaisDraft,
} from '@/lib/diagnosticoPatrimonialModalModels';

/**
 * Titularidade do cadastro NOVO: os mesmos dois baldes (FT e DT) da aba de
 * titularidade da edição, em estado local.
 *
 * O que existia aqui era um titular só, e sempre de Propriedade de Direito.
 * Quem tinha composse cadastrava com uma pessoa e ia EDITAR em seguida para pôr
 * as outras e as frações — e a Propriedade de Fato não tinha como entrar antes
 * de salvar. As duas espécies e a lista inteira cabem no formulário de criação
 * porque nada disso vai ao banco antes do clique em cadastrar: é o mesmo
 * rascunho local que já viajava entre a coluna estreita e o modal.
 */

const ESPECIE: Record<TipoTitularidadeInicial, { code: string; label: string }> = {
  FATO: { code: 'FT', label: 'Propriedade de Fato' },
  DIREITO: { code: 'DT', label: 'Propriedade de Direito' },
};

interface TitularesIniciaisSectionProps {
  entity: 'bem' | 'matrícula';
  pessoas: PessoaRow[];
  value: TitularesIniciaisDraft;
  onChange: (value: TitularesIniciaisDraft) => void;
  /** Números das duas seções. Muda na coluna estreita, onde elas não abrem a aba. */
  numeros?: [string, string];
}

export function TitularesIniciaisSection({
  entity, pessoas, value, onChange, numeros = ['01', '02'],
}: TitularesIniciaisSectionProps) {
  if (pessoas.length === 0) {
    return (
      <FieldSection number={numeros[0]} title="Titularidade">
        <div className="rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-4">
          <p className="text-xs text-warning">
            Nenhuma pessoa disponível. Cadastre o titular na Qualificação das Partes (ou selecione
            um cliente) antes de criar {entity === 'bem' ? 'o bem' : 'a matrícula'}.
          </p>
        </div>
      </FieldSection>
    );
  }

  const trocarLinha = (key: string, patch: Partial<TitularInicialDraft>) =>
    onChange(value.map((linha) => (linha.key === key ? { ...linha, ...patch } : linha)));

  const removerLinha = (key: string) => onChange(value.filter((linha) => linha.key !== key));

  const adicionarLinha = (tipo: TipoTitularidadeInicial) =>
    onChange([...value, novaLinhaTitular(tipo)]);

  // Copiar da FT: as mesmas pessoas e frações, na outra espécie. É o gesto que a
  // aba da edição já oferece, e o caso comum (quem possui de fato também consta
  // no registro) escreveria a lista duas vezes à mão sem ele.
  const copiarDaFt = () => {
    const jaEmDt = new Set(
      value.filter((l) => l.tipo === 'DIREITO' && l.titular_pessoa_id).map((l) => l.titular_pessoa_id),
    );
    const copiadas = value
      .filter((l) => l.tipo === 'FATO' && l.titular_pessoa_id && !jaEmDt.has(l.titular_pessoa_id))
      .map((l) => ({ ...novaLinhaTitular('DIREITO'), titular_pessoa_id: l.titular_pessoa_id, fracao: l.fracao }));
    if (copiadas.length === 0) return;
    // As linhas de DT em branco saem: eram o lugar onde a cópia ia entrar.
    onChange([...value.filter((l) => l.tipo !== 'DIREITO' || l.titular_pessoa_id), ...copiadas]);
  };

  const temFatoPreenchida = value.some((l) => l.tipo === 'FATO' && l.titular_pessoa_id);

  return (
    <div>
      <Balde
        numero={numeros[0]}
        tipo="FATO"
        linhas={value.filter((l) => l.tipo === 'FATO')}
        pessoas={pessoas}
        onLinha={trocarLinha}
        onRemover={removerLinha}
        onAdicionar={() => adicionarLinha('FATO')}
      />
      <Balde
        numero={numeros[1]}
        tipo="DIREITO"
        linhas={value.filter((l) => l.tipo === 'DIREITO')}
        pessoas={pessoas}
        onLinha={trocarLinha}
        onRemover={removerLinha}
        onAdicionar={() => adicionarLinha('DIREITO')}
        onCopiarDaFt={temFatoPreenchida ? copiarDaFt : undefined}
        rodape={entity === 'bem'
          ? 'Todo bem sem matrícula precisa de ao menos um titular. Deixe a fração vazia quando a composse for indefinida.'
          : 'Toda matrícula precisa de ao menos um titular — é ele que define o cliente. Deixe a fração vazia quando a composse for indefinida.'}
      />
    </div>
  );
}

interface BaldeProps {
  numero: string;
  tipo: TipoTitularidadeInicial;
  linhas: TitularesIniciaisDraft;
  pessoas: PessoaRow[];
  onLinha: (key: string, patch: Partial<TitularInicialDraft>) => void;
  onRemover: (key: string) => void;
  onAdicionar: () => void;
  onCopiarDaFt?: () => void;
  rodape?: string;
}

function Balde({
  numero, tipo, linhas, pessoas, onLinha, onRemover, onAdicionar, onCopiarDaFt, rodape,
}: BaldeProps) {
  const { code, label } = ESPECIE[tipo];
  const comFracao = linhas.filter((l) => l.titular_pessoa_id && l.fracao.trim() && !Number.isNaN(Number(l.fracao)));
  const totalFracao = comFracao.reduce((soma, l) => soma + Number(l.fracao), 0);

  return (
    <FieldSection
      number={numero}
      title={label}
      badge={
        <span className="inline-flex h-5 items-center rounded bg-osg-500 px-1.5 font-mono text-[10px] font-bold text-white">
          {code}
        </span>
      }
      hint={comFracao.length > 0 ? (
        <span className={totalFracao > 100 ? 'tabular-nums text-destructive' : 'tabular-nums'}>
          {totalFracao}%{totalFracao > 100 && ' • excede 100%'}
        </span>
      ) : undefined}
      actions={onCopiarDaFt ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 bg-osg-moss/10 text-xs text-osg-moss hover:bg-osg-moss/15"
          onClick={onCopiarDaFt}
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar da FT
        </Button>
      ) : undefined}
    >
      <div className="space-y-2">
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum titular.</p>
        ) : (
          linhas.map((linha) => (
            <div
              key={linha.key}
              className={`${formGridCls(4)} items-end gap-2 rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-3`}
            >
              <Campo rotulo="Titular" required campo="titular_pessoa_id" className={formSpanCls(2)}>
                <Select
                  value={linha.titular_pessoa_id || undefined}
                  onValueChange={(id) => onLinha(linha.key, { titular_pessoa_id: id })}
                >
                  <SelectTrigger aria-label="Titular" className={fieldCls}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pessoas.map((pessoa) => (
                      <SelectItem key={pessoa.id} value={pessoa.id}>
                        {pessoa.denominacao}{' '}
                        <span className="text-xs text-muted-foreground">({pessoa.tipo_pessoa})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo rotulo="Fração (%) — opcional" campo="titular_fracao">
                <Input
                  type="number"
                  step={FRACAO_STEP}
                  min="0"
                  max="100"
                  value={linha.fracao}
                  onChange={(event) => onLinha(linha.key, { fracao: clampFracaoInput(event.target.value) })}
                  placeholder="ex: 50"
                  aria-label="Fração (%)"
                  className={`${fieldCls} font-mono`}
                />
              </Campo>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-destructive"
                  title={`Remover este titular de ${code}`}
                  aria-label={`Remover titular de ${code}`}
                  onClick={() => onRemover(linha.key)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start gap-1.5 border border-dashed border-osg-200 text-muted-foreground hover:text-osg-700"
          onClick={onAdicionar}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar titular de {code}
        </Button>
        {rodape && <p className="text-[11px] text-muted-foreground">{rodape}</p>}
      </div>
    </FieldSection>
  );
}
