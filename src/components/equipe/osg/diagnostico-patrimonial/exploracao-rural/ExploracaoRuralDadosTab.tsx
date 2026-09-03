import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import { FieldSection, fieldCls, switchBoxCls } from '@/components/equipe/osg/formKit';
import { formGridCls } from '@/lib/osgFormGrid';
import { clampFracaoInput, FRACAO_STEP } from '@/components/equipe/osg/diagnostico-patrimonial/fracaoUtils';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import { Campo } from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/CampoComDica';
import {
  MODALIDADE_PECUARIA_OPCOES,
  statusDaPartilha,
  TIPOS_EXPLORACAO_OPCOES,
  UNIDADES_DE_PRAZO,
  type DraftExploracaoRural,
  type LiquidacaoPeriodicidade,
  type RegraAdministracao,
  type TipoExploracaoRural,
  type UnidadeDePrazo,
} from '@/lib/exploracaoRuralModalModels';

// Aba "Dados" do cadastro de exploração rural: o INSTRUMENTO em si.
//
// O que NÃO está aqui, de propósito:
//   · as partes (outorgante, exploradores, compossuidores, administradores
//     nomeados) — aba própria, porque a mesma pessoa pode ocupar dois papéis;
//   · os imóveis e as origens — aba própria, porque um instrumento tem N imóveis
//     e a origem é por imóvel, não pelo instrumento;
//   · foro, testemunhas e número de vias — NÃO são cadastro. São dados do ato de
//     assinar, vivem em `documento_gerado.snapshot_dados` versionados por minuta, e
//     a tela real de "Gerar Documento" já os pede no painel "Preencher à mão"
//     (achados #4/#5 do relatório 13 da ALE-3);
//   · `declarado_irpf` e `sacas_por_hectare` — as colunas existem e o `FiscalReport`
//     as lê, mas nenhuma cláusula dos modelos as usa. O IRPF é anual e a coluna é um
//     sim/não único, então o formato provavelmente está errado; ficou pendente com o
//     time Fiscal (decisão de 01/09/2026).
//
// As seções marcadas (P) só existem na parceria e as (C) só na composse — por isso a
// numeração é um CONTADOR, não literal: seção condicional não pode deixar buraco.
//
// SOBRE OS TEXTOS DA TELA: o lastro de cada campo (qual contrato real provou que ele
// existe, qual cláusula o usa) fica NESTES COMENTÁRIOS e nos relatórios da ALE-3 —
// nunca na interface. Ver a regra 2 em `CampoComDica.tsx`.

interface Props {
  draft: DraftExploracaoRural;
  onChange: (draft: DraftExploracaoRural) => void;
  documentos: DocumentoArquivoRow[];
}

const SEM_DOCUMENTO = '__nenhum__';

export function ExploracaoRuralDadosTab({ draft, onChange, documentos }: Props) {
  const set = <K extends keyof DraftExploracaoRural>(key: K, value: DraftExploracaoRural[K]) =>
    onChange({ ...draft, [key]: value });

  const parceria = draft.tipo_exploracao === 'parceria';
  // O que um lado leva o outro nao leva: a partilha fecha 100%, como a da composse.
  const partilha = statusDaPartilha(draft.percentual_outorgante, draft.percentual_explorador);
  const composse = draft.tipo_exploracao === 'composse';

  let numero = 0;
  const next = () => String(++numero).padStart(2, '0');

  const documentoSelect = (valor: string | null, aoTrocar: (v: string | null) => void) => (
    <Select
      value={valor ?? SEM_DOCUMENTO}
      onValueChange={(v) => aoTrocar(v === SEM_DOCUMENTO ? null : v)}
    >
      <SelectTrigger className={fieldCls}>
        <SelectValue placeholder={documentos.length ? 'Selecione…' : 'Nenhum documento do cliente'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SEM_DOCUMENTO}>— nenhum —</SelectItem>
        {documentos.map((doc) => (
          <SelectItem key={doc.id} value={doc.id}>{doc.nome_original}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <FieldSection number={next()} title="Instrumento">
        <div className={`${formGridCls(4)} items-end gap-3`}>
          <Campo
            label="Tipo"
            required
            campo="tipo_exploracao"
            dica="Que instrumento este cadastro representa. Parceria e composse têm cláusulas próprias; os outros tipos guardam apenas o instrumento e os imóveis."
          >
            <Select
              value={draft.tipo_exploracao}
              onValueChange={(v: TipoExploracaoRural) => set('tipo_exploracao', v)}
            >
              <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_EXPLORACAO_OPCOES.map((opcao) => (
                  <SelectItem key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo
            label="Referência"
            colunas={2}
            dica="Nome curto para encontrar este instrumento nas listas e nos relatórios. Não aparece no texto do contrato."
          >
            <Input
              value={draft.referencia}
              onChange={(e) => set('referencia', e.target.value)}
              className={fieldCls}
              placeholder="ex: Parceria da Fazenda Boa Vista"
            />
          </Campo>
          <Campo
            label="Data de assinatura"
            campo="data_assinatura"
            dica="Data em que o instrumento foi ou será assinado. É a data que abre o contrato."
          >
            <DateFieldWithInput
              value={draft.data_assinatura}
              onChange={(v) => set('data_assinatura', v)}
            />
          </Campo>
          {parceria && (
            <Campo
              label="Data de encerramento"
              dica="Data em que a parceria termina. A composse não tem encerramento: ela tem prazo de indivisão."
            >
              <DateFieldWithInput
                value={draft.data_encerramento}
                onChange={(v) => set('data_encerramento', v)}
              />
            </Campo>
          )}
        </div>
      </FieldSection>

      {parceria && (
        <FieldSection number={next()} title="Vigência">
          <div className={`${formGridCls(4)} items-end gap-3`}>
            <Campo
              label="Início da vigência"
              dica="Preencha só quando a vigência começar em data diferente da assinatura. Em branco, vale a data da assinatura."
            >
              <DateFieldWithInput
                value={draft.data_inicio_vigencia}
                onChange={(v) => set('data_inicio_vigencia', v)}
              />
            </Campo>
            <Campo
              label="Prorrogável"
              dica="Se o contrato se renova sozinho ao vencer, sem precisar de nova assinatura."
            >
              <div className={switchBoxCls}>
                <Switch
                  checked={draft.vigencia_prorrogavel}
                  onCheckedChange={(v) => set('vigencia_prorrogavel', v)}
                />
                <Label className="text-sm">sim</Label>
              </div>
            </Campo>
          </div>
        </FieldSection>
      )}

      {/* Percentual só existe na parceria: é o corte outorgante × explorador da
          Cláusula Quinta. Na composse os frutos se repartem pelas frações dos
          compossuidores (aba Partes), e a partilha com quem cedeu a terra pertence à
          parceria de origem, não a este instrumento. */}
      {parceria && (
        <FieldSection
          number={next()}
          title="Partilha"
          hint={
            partilha.preenchida ? (
              <span className={partilha.fecha ? 'tabular-nums text-osg-moss' : 'tabular-nums text-destructive'}>
                {partilha.soma}%
                {partilha.fecha
                  ? ' • fecha'
                  : partilha.excede
                    ? ' • passa de 100%'
                    : ` • faltam ${partilha.faltam}%`}
              </span>
            ) : undefined
          }
        >
          <div className={`${formGridCls(4)} items-end gap-3`}>
            <Campo
              label="Percentual do outorgante"
              dica="Parte da produção ou dos frutos que fica com quem cedeu a terra."
            >
              <Percentual
                value={draft.percentual_outorgante}
                onChange={(v) => set('percentual_outorgante', v)}
              />
            </Campo>
            <Campo
              label="Percentual do explorador"
              dica="Parte da produção ou dos frutos que fica com quem explora a terra. Somado ao do outorgante, fecha o total."
            >
              <Percentual
                value={draft.percentual_explorador}
                onChange={(v) => set('percentual_explorador', v)}
              />
            </Campo>
          </div>
        </FieldSection>
      )}

      {/* Culturas ocupa 2 colunas e os dois switches fecham as outras 2 — a linha de 4
          fecha exata, sem meia linha vazia no meio da grade. */}
      <FieldSection number={next()} title="Atividade">
        <div className={`${formGridCls(4)} items-end gap-3`}>
          <Campo
            label="Culturas permitidas"
            colunas={2}
            dica="O que pode ser plantado ou criado na área. Escreva a lista combinada neste contrato, separada por ponto e vírgula."
          >
            <Input
              value={draft.culturas}
              onChange={(e) => set('culturas', e.target.value)}
              className={fieldCls}
              placeholder="soja; milho; algodão; pecuária"
            />
          </Campo>
          {parceria && (
            <Campo
              label="Inclui pecuária?"
              dica="Se a exploração também abrange criação de animais. Desligado, o contrato passa a falar de exploração agrícola em vez de agropecuária."
            >
              <div className={switchBoxCls}>
                <Switch
                  checked={draft.inclui_pecuaria}
                  onCheckedChange={(v) => set('inclui_pecuaria', v)}
                />
                <Label className="text-sm">sim</Label>
              </div>
            </Campo>
          )}
          {/* As modalidades ficam AQUI, colados no interruptor do gado, e não num
              painel de flags: quem cadastra a parceria já está olhando para este
              campo. E são caixas, não rádio — o contrato do MMS tem as três, o do
              Bela Vista tem duas. */}
          {parceria && draft.inclui_pecuaria && (
            <Campo
              label="Modalidades da pecuária"
              campo="pecuaria_modalidades"
              colunas={2}
              dica="Define o que conta como FRUTO na partilha da Cláusula Quinta, e cada uma mede de um jeito. Marque todas as que este contrato explora."
            >
              <div className="flex flex-col gap-2 pt-1">
                {MODALIDADE_PECUARIA_OPCOES.map((o) => {
                  const marcada = draft.pecuaria_modalidades.includes(o.valor);
                  return (
                    <label key={o.valor} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={marcada}
                        onCheckedChange={(v) => set(
                          'pecuaria_modalidades',
                          v
                            ? [...draft.pecuaria_modalidades, o.valor]
                            : draft.pecuaria_modalidades.filter((m) => m !== o.valor),
                        )}
                        className="mt-0.5"
                      />
                      <span>
                        {o.rotulo}
                        <span className="block text-xs text-muted-foreground">{o.dica}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </Campo>
          )}
          <Campo
            label="Permite penhor"
            dica="Se as partes autorizam a produção ou os bens a servirem de garantia num financiamento."
          >
            <div className={switchBoxCls}>
              <Switch
                checked={draft.permite_penhor}
                onCheckedChange={(v) => set('permite_penhor', v)}
              />
              <Label className="text-sm">sim</Label>
            </div>
          </Campo>
        </div>
      </FieldSection>

      {/* Quantidade e unidade SEPARADAS, nunca texto livre: uma composse real saiu com
          "prazo de 10 (dez) anos… renovando-se o prazo de 03 (três) anos" porque o "3
          anos" sobrou do template dentro de um campo de texto e ninguém viu. */}
      {composse && (
        <FieldSection number={next()} title="Indivisão">
          <div className={`${formGridCls(4)} items-end gap-3`}>
            <Campo
              label="Prazo de indivisão"
              dica="Por quanto tempo os compossuidores ficam impedidos de pedir a divisão do imóvel."
            >
              <Prazo
                quantidade={draft.prazo_indivisao_quantidade}
                unidade={draft.prazo_indivisao_unidade}
                onQuantidade={(v) => set('prazo_indivisao_quantidade', v)}
                onUnidade={(v) => set('prazo_indivisao_unidade', v)}
              />
            </Campo>
            <Campo
              label="Prorrogável"
              dica="Se o prazo de indivisão se renova automaticamente ao vencer."
            >
              <div className={switchBoxCls}>
                <Switch
                  checked={draft.indivisao_prorrogavel}
                  onCheckedChange={(v) => set('indivisao_prorrogavel', v)}
                />
                <Label className="text-sm">sim</Label>
              </div>
            </Campo>
            <Campo
              label="Aviso prévio"
              dica="Com quanta antecedência é preciso avisar que não quer renovar a indivisão, antes de o prazo vencer."
            >
              <Prazo
                quantidade={draft.indivisao_aviso_quantidade}
                unidade={draft.indivisao_aviso_unidade}
                onQuantidade={(v) => set('indivisao_aviso_quantidade', v)}
                onUnidade={(v) => set('indivisao_aviso_unidade', v)}
              />
            </Campo>
          </div>
        </FieldSection>
      )}

      {/* `regra_administracao` é enum porque os dois modelos reais divergem: um autoriza
          atos pela maioria dos percentuais, o outro nomeia compossuidores fixos. Quem
          age isoladamente ou em conjunto NÃO é campo — deriva da contagem de nomeados
          na aba Partes. */}
      {composse && (
        <FieldSection number={next()} title="Administração e liquidação">
          <div className={`${formGridCls(4)} items-end gap-3`}>
            <Campo
              label="Regra de administração"
              dica="Quem pode decidir e agir em nome da composse no dia a dia: a maioria dos percentuais, ou pessoas nomeadas no contrato."
            >
              <Select
                value={draft.regra_administracao}
                onValueChange={(v: RegraAdministracao) => set('regra_administracao', v)}
              >
                <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maioria">Maioria dos percentuais</SelectItem>
                  <SelectItem value="nomeados">Administradores nomeados</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo
              label="Liquidação"
              dica="De quanto em quanto tempo sai cada parcela do acerto de contas entre os compossuidores."
            >
              <Select
                value={draft.liquidacao_periodicidade}
                onValueChange={(v: LiquidacaoPeriodicidade) => set('liquidacao_periodicidade', v)}
              >
                <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo
              label="Número de parcelas"
              dica="Em quantas parcelas o acerto de contas é pago a quem sai da composse."
            >
              <Input
                type="number"
                min={1}
                value={draft.liquidacao_numero_parcelas}
                onChange={(e) => set('liquidacao_numero_parcelas', e.target.value)}
                className={`${fieldCls} font-mono`}
                placeholder="ex: 60"
              />
            </Campo>
          </div>
        </FieldSection>
      )}

      {/* Referência de arquivo, não conteúdo de cláusula: nenhum bloco dos dois modelos
          cita estes documentos. Ficam por último, depois de tudo que o texto do
          contrato de fato usa. */}
      <FieldSection number={next()} title="Lastro documental">
        <div className={`${formGridCls(2)} items-end gap-3`}>
          <Campo
            label="Estudo fiscal"
            dica="Arquivo já guardado nos documentos deste cliente que embasou os termos combinados aqui."
          >
            {documentoSelect(draft.estudo_fiscal_documento_id, (v) =>
              set('estudo_fiscal_documento_id', v),
            )}
          </Campo>
          <Campo
            label="Documento comprobatório"
            dica="Arquivo que comprova como a posse dos imóveis deste instrumento foi adquirida."
          >
            {documentoSelect(draft.documento_comprobatorio_id, (v) =>
              set('documento_comprobatorio_id', v),
            )}
          </Campo>
        </div>
      </FieldSection>
    </>
  );
}

/** Percentual com as 4 casas da casa (ver `fracaoUtils`): 1/3 não cabe em 2 casas. */
function Percentual({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="number"
      step={FRACAO_STEP}
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(clampFracaoInput(e.target.value))}
      className={`${fieldCls} font-mono`}
      placeholder="ex: 30"
    />
  );
}

function Prazo({
  quantidade, unidade, onQuantidade, onUnidade,
}: {
  quantidade: string;
  unidade: UnidadeDePrazo;
  onQuantidade: (v: string) => void;
  onUnidade: (v: UnidadeDePrazo) => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={1}
        value={quantidade}
        onChange={(e) => onQuantidade(e.target.value)}
        className={`${fieldCls} font-mono`}
        placeholder="ex: 3"
      />
      <Select value={unidade} onValueChange={(v: UnidadeDePrazo) => onUnidade(v)}>
        <SelectTrigger className={`${fieldCls} w-28 shrink-0`}><SelectValue /></SelectTrigger>
        <SelectContent>
          {UNIDADES_DE_PRAZO.map((u) => (
            <SelectItem key={u} value={u}>{u}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
