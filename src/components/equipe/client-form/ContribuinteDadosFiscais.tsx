// Seção 03 do formulário de contribuinte: inscrição estadual, CNAE, Simples e
// contribuinte de faturamento.
//
// Sai do `ContribuintesTab` porque é o bloco mais autocontido do formulário e o
// arquivo da aba já passava do teto de linhas do AGENTS.md. Recebe o rascunho e
// devolve o que mudou; não sabe de lista, seleção nem escopo de edição.
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RequiredMark } from '@/components/ui/required-mark';
import { cn } from '@/lib/utils';
import type { DraftEntity, InscricaoIE } from '@/types/clientForm';
import InscricoesEstaduaisEditor from './InscricoesEstaduaisEditor';
import MarcaPendencia, { CLASSE_CAMPO_PENDENTE } from './MarcaPendencia';

const ROTULO = 'w-48 shrink-0 text-xs font-semibold text-muted-foreground';

export interface ContribuinteDadosFiscaisProps {
  contribuinte: DraftEntity;
  onChange: (patch: Partial<DraftEntity>) => void;
  inscricoes: InscricaoIE[];
  onInscricoesChange: (lista: InscricaoIE[]) => void;
  /** A frase da falta de um campo, quando há. */
  falta: (campo: string) => string | undefined;
}

export default function ContribuinteDadosFiscais({
  contribuinte: ent,
  onChange,
  inscricoes,
  onInscricoesChange,
  falta,
}: ContribuinteDadosFiscaisProps) {
  const ehPJ = ent.tipo_pessoa === 'PJ';
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-row items-center gap-4">
        <Label className={ROTULO}>Possui Inscrição Estadual?</Label>
        <div className="flex-1">
          <Select
            value={ent.situacao_inscricao_estadual || undefined}
            onValueChange={(v) => {
              onChange({ situacao_inscricao_estadual: v });
              // Declarar que não tem IE limpa a lista: manter as linhas gravaria
              // inscrições que o contribuinte acabou de dizer não possuir.
              if (v !== 'sim') onInscricoesChange([]);
            }}
          >
            <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
              <SelectItem value="isento">Isento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {ent.situacao_inscricao_estadual === 'sim' && (
        <InscricoesEstaduaisEditor
          inscricoes={inscricoes}
          onChange={onInscricoesChange}
          pendencia={falta('inscricoes')}
        />
      )}

      {ehPJ && (
        <div className="flex flex-row items-center gap-4">
          <Label className={ROTULO}>CNAE<RequiredMark /></Label>
          <div className="flex-1">
            <Input
              value={ent.cod_cnae || ''}
              onChange={(e) => onChange({ cod_cnae: e.target.value })}
              aria-invalid={!!falta('cod_cnae') || undefined}
              className={cn('h-8 max-w-[200px]', falta('cod_cnae') && CLASSE_CAMPO_PENDENTE)}
            />
            <MarcaPendencia>{falta('cod_cnae')}</MarcaPendencia>
          </div>
        </div>
      )}

      {/* Vem da consulta à Receita e não se digita. */}
      {ehPJ && ent.atividade_principal && (
        <div className="flex flex-row items-center gap-4">
          <Label className={ROTULO}>Atividade Principal</Label>
          <div className="flex-1">
            <Input value={ent.atividade_principal || ''} disabled className="h-8 bg-muted/50" />
          </div>
        </div>
      )}

      {ehPJ && (
        <div className="flex flex-row items-center gap-4">
          <Label className={ROTULO}>Simples Nacional<RequiredMark /></Label>
          <div className="flex-1">
            <Select value={ent.simples_nacional || undefined} onValueChange={(v) => onChange({ simples_nacional: v })}>
              <SelectTrigger className={cn('h-8 max-w-[200px]', falta('simples_nacional') && CLASSE_CAMPO_PENDENTE)}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="optante">Optante</SelectItem>
                <SelectItem value="nao_optante">Não Optante</SelectItem>
              </SelectContent>
            </Select>
            <MarcaPendencia>{falta('simples_nacional')}</MarcaPendencia>
          </div>
        </div>
      )}

      <div className="flex flex-row items-center gap-4">
        <Label className={ROTULO}>Contribuinte de Faturamento</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={!!ent.contribuinte_faturamento}
            onCheckedChange={(v) => onChange({ contribuinte_faturamento: v })}
          />
          <span className="text-xs text-muted-foreground">{ent.contribuinte_faturamento ? 'Sim' : 'Não'}</span>
        </div>
      </div>
    </div>
  );
}
