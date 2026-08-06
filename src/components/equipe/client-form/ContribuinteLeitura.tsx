// A ficha do contribuinte em modo de leitura.
//
// Sai do `ContribuintesTab` porque não compartilha nada com a edição: não tem
// estado, não altera nada, e o arquivo da aba já passava do teto de linhas do
// AGENTS.md. Aqui é só a apresentação do que está gravado.
import { Badge } from '@/components/ui/badge';
import type { DraftEntity, InscricaoIE } from '@/types/clientForm';
import FieldPair from './FieldPair';

const SITUACAO_IE: Record<string, string> = {
  sim: 'Sim',
  nao: 'Não',
  isento: 'Isento',
};

export interface ContribuinteLeituraProps {
  contribuinte: DraftEntity;
  /** As inscrições estaduais deste contribuinte, já resolvidas pela chave. */
  inscricoes: InscricaoIE[];
}

export default function ContribuinteLeitura({ contribuinte: ent, inscricoes }: ContribuinteLeituraProps) {
  const ehPJ = ent.tipo_pessoa === 'PJ';
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 [&>*]:min-w-0">
      <FieldPair label="Tipo Pessoa" value={ent.tipo_pessoa} />
      <FieldPair label="CPF/CNPJ" value={ent.cpf_cnpj} />
      <FieldPair label="Razão Social / Nome Completo" value={ent.nome_razao_social} />
      {ent.tipo_pessoa !== 'PF' && <FieldPair label="Nome Fantasia" value={ent.nome_fantasia} />}
      <FieldPair label="Telefone" value={ent.telefone} />
      <FieldPair
        label="Possui Inscrição Estadual?"
        value={SITUACAO_IE[ent.situacao_inscricao_estadual] ?? '—'}
      />
      {ent.situacao_inscricao_estadual === 'sim' && (
        <div className="col-span-2 min-w-0 md:col-span-3">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {inscricoes.length > 0 ? (
              inscricoes.map((ie) => (
                <Badge key={ie._tempId} variant="secondary" className="text-xs">
                  {ie.uf} — {ie.situacao === 'isento' ? 'Isento' : ie.situacao === 'nao' ? 'Não inscrito' : ie.numero_ie || '—'}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Nenhuma IE cadastrada</span>
            )}
          </div>
        </div>
      )}
      {ehPJ && <FieldPair label="CNAE" value={ent.cod_cnae} />}
      {ehPJ && ent.atividade_principal && <FieldPair label="Atividade Principal" value={ent.atividade_principal} />}
      {ehPJ && (
        <FieldPair
          label="Simples Nacional"
          value={ent.simples_nacional === 'optante' ? 'Optante' : ent.simples_nacional === 'nao_optante' ? 'Não Optante' : '—'}
        />
      )}
      <FieldPair label="CEP" value={ent.cep} />
      <FieldPair label="Logradouro" value={ent.logradouro} />
      <FieldPair label="Número" value={ent.numero} />
      <FieldPair label="Complemento" value={ent.complemento} />
      <FieldPair label="Bairro" value={ent.bairro} />
      <FieldPair label="Município" value={ent.municipio} />
      <FieldPair label="UF" value={ent.uf} />
      <FieldPair label="Contribuinte de Faturamento" value={ent.contribuinte_faturamento ? 'Sim' : 'Não'} />
    </div>
  );
}
