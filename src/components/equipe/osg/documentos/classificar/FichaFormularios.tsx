import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldSection, fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import { BemDadosTab } from '@/components/equipe/osg/diagnostico-patrimonial/bem/BemDadosTab';
import { MatriculaDadosTab } from '@/components/equipe/osg/diagnostico-patrimonial/matricula/MatriculaDadosTab';
import { TitularInicialSection } from '@/components/equipe/osg/diagnostico-patrimonial/titularidade/TitularInicialSection';
import type { BemRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { DraftBem, DraftMatricula, TitularInicialDraft } from '@/lib/diagnosticoPatrimonialModalModels';
import { bemEhImovel } from '@/lib/classificarFicha';

/**
 * Os formulários reais de bem e matrícula montados na coluna estreita. São as
 * mesmas abas "Dados" dos modais de cadastro; o que muda é só o que o modal
 * resolvia com abas e aqui precisa vir junto na mesma rolagem — o titular
 * inicial e, na matrícula, o imóvel a que ela pertence.
 */

const SEM_MATRICULAS = { isEdit: false, loadingMatriculas: false, matriculas: [], onLink: () => {}, onAdd: () => {}, onEdit: () => {}, onUnlink: () => {}, onDelete: () => {} };

export function FormBem({
  draft, onChange, pessoas, titular, onTitular,
}: {
  draft: DraftBem;
  onChange: (draft: DraftBem) => void;
  pessoas: PessoaRow[];
  titular: TitularInicialDraft;
  onTitular: (titular: TitularInicialDraft) => void;
}) {
  return (
    <>
      <BemDadosTab draft={draft} onChange={onChange} pessoas={pessoas} {...SEM_MATRICULAS} />
      {/* Imóvel tem titular na matrícula; os demais bens precisam do titular aqui. */}
      {!bemEhImovel(draft) && (
        <TitularInicialSection entity="bem" pessoas={pessoas} value={titular} onChange={onTitular} />
      )}
    </>
  );
}

export function FormMatricula({
  draft, onChange, pessoas, imoveis, bemId, onBemId, titular, onTitular,
}: {
  draft: DraftMatricula;
  onChange: (draft: DraftMatricula) => void;
  pessoas: PessoaRow[];
  imoveis: BemRow[];
  bemId: string;
  onBemId: (bemId: string) => void;
  titular: TitularInicialDraft;
  onTitular: (titular: TitularInicialDraft) => void;
}) {
  const bem = imoveis.find((item) => item.id === bemId) ?? null;
  return (
    <>
      <FieldSection number="00" title="Imóvel">
        <div className="space-y-1.5">
          <Label className={labelCls}>
            Bem a que a matrícula pertence
            <RequiredMark />
          </Label>
          {imoveis.length === 0 ? (
            <p className="text-xs text-warning">
              Nenhum imóvel cadastrado para este cliente. Cadastre o bem (imóvel rural ou urbano)
              antes da matrícula — inclusive por aqui, trocando o tipo de ficha para "Bem".
            </p>
          ) : (
            <Select value={bemId || undefined} onValueChange={onBemId}>
              <SelectTrigger className={fieldCls}>
                <SelectValue placeholder="Selecione o imóvel..." />
              </SelectTrigger>
              <SelectContent>
                {imoveis.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {[item.referencia_dp, item.denominacao].filter(Boolean).join(' — ') || 'Bem'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </FieldSection>
      <MatriculaDadosTab
        draft={draft}
        onChange={onChange}
        bemTipo={bem?.tipo_bem ?? null}
        matricula={null}
        matriculasDoBem={[]}
      />
      <TitularInicialSection entity="matrícula" pessoas={pessoas} value={titular} onChange={onTitular} />
    </>
  );
}
