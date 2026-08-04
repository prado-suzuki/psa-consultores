import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { fieldCls, labelCls, textareaCls } from '@/components/equipe/osg/formKit';
import { GRUPOS_DOCUMENTO, type GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';
import {
  GRANULARIDADES,
  grupoSugeridoParaGranularidade,
  ROTULO_GRANULARIDADE,
  type CatalogoDocumento,
  type Granularidade,
  type ItemSolicitacao,
} from '@/lib/solicitacao';

/**
 * O que o modal devolve.
 *
 * Não existe mais entidade nem módulo aqui: a entidade era DERIVADA da gaveta por
 * um mapa de chute, e foi dele que saiu o `entidade = 'Bem'` que apareceu em 7
 * linhas de cliente enquanto o catálogo, corrigido depois, dizia 'Cliente'. O que
 * se pede agora são os dois dados estruturais que `solicitacao_item` exige: o
 * GRÃO e a GAVETA.
 *
 * O campo "Produto de destino" saiu na ALE-28: era obrigatório para salvar e o
 * valor nunca era gravado — não existe coluna de produto no pedido.
 */
export interface DocumentEditorValue {
  /** Documento do catálogo escolhido; ausente = documento novo, criado à mão. */
  catalogId?: string;
  documento: string;
  nota: string;
  granularidade: Granularidade;
  grupo: GrupoDocumentoKey;
}

interface DocumentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  /** No modo editar, o item que já está na solicitação. */
  item?: ItemSolicitacao;
  /** Catálogo na forma de gravação, para a lista de escolha. */
  catalogo: CatalogoDocumento[];
  /** Ids de catálogo já pedidos — não aparecem na lista de escolha. */
  idsJaPedidos: Set<string>;
  onSave: (value: DocumentEditorValue) => void;
}

const NOVO_DOCUMENTO = '__novo__';

/**
 * Os grãos oferecidos.
 *
 * `bem` fica fora: existe no CHECK da tabela, mas nenhum item do catálogo o usa
 * hoje — oferecer abriria pedido num grão que o resto do fluxo não trata.
 */
const GRAOS_OFERECIDOS = GRANULARIDADES.filter((grao) => grao !== 'bem');

const GRAO_PADRAO: Granularidade = 'cliente';

const valorVazio = (): DocumentEditorValue => ({
  documento: '',
  nota: '',
  granularidade: GRAO_PADRAO,
  grupo: grupoSugeridoParaGranularidade(GRAO_PADRAO),
});

/** Campo no padrão dos modais OSG: rótulo miúdo + controle com foco verde-musgo. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={labelCls}>{label}</Label>
      {children}
    </div>
  );
}

export function DocumentEditorDialog({
  open,
  onOpenChange,
  mode,
  item,
  catalogo,
  idsJaPedidos,
  onSave,
}: DocumentEditorDialogProps) {
  const [value, setValue] = useState<DocumentEditorValue>(valorVazio);
  const [escolha, setEscolha] = useState(NOVO_DOCUMENTO);

  useEffect(() => {
    if (!open) return;
    setEscolha(NOVO_DOCUMENTO);
    setValue(item
      ? {
        catalogId: item.itemPadraoId ?? undefined,
        documento: item.documento,
        nota: item.nota ?? '',
        granularidade: item.granularidade,
        grupo: item.grupo,
      }
      : valorVazio());
  }, [item, open]);

  /** A lista de escolha respeita o grão e esconde o que já foi pedido. */
  const doCatalogoNoGrao = useMemo(
    () => catalogo
      .filter((documento) =>
        documento.granularidade === value.granularidade && !idsJaPedidos.has(documento.id))
      .sort((esquerda, direita) =>
        esquerda.documento.localeCompare(direita.documento, 'pt-BR')),
    [catalogo, idsJaPedidos, value.granularidade],
  );

  /**
   * Trocar o grão re-sugere a gaveta — e só sugere.
   *
   * Sugerir e deixar trocar é o ponto da decisão de 31/07/2026: no grão
   * `cliente` a gaveta não é dedutível. Dos itens do catálogo que precisaram de
   * decisão manual, três eram grão `cliente` e foram para "Bens e Imóveis".
   */
  const trocarGrao = (granularidade: Granularidade) => {
    setEscolha(NOVO_DOCUMENTO);
    setValue((atual) => ({
      ...atual,
      granularidade,
      grupo: grupoSugeridoParaGranularidade(granularidade),
      catalogId: undefined,
      documento: mode === 'edit' ? atual.documento : '',
      nota: mode === 'edit' ? atual.nota : '',
    }));
  };

  const escolherDocumento = (proxima: string) => {
    setEscolha(proxima);
    if (proxima === NOVO_DOCUMENTO) {
      setValue((atual) => ({ ...atual, catalogId: undefined, documento: '', nota: '' }));
      return;
    }

    const doCatalogo = catalogo.find((documento) => documento.id === proxima);
    if (!doCatalogo) return;
    setValue({
      catalogId: doCatalogo.id,
      documento: doCatalogo.documento,
      nota: doCatalogo.nota ?? '',
      granularidade: value.granularidade,
      // A gaveta do catálogo vem gravada no próprio tipo (ALE-26).
      grupo: doCatalogo.grupo,
    });
  };

  const ehNovo = escolha === NOVO_DOCUMENTO;
  // No modo editar de um item de catálogo, nome vazio é legítimo: significa
  // voltar a herdar o texto do catálogo. No item manual, o nome é o único texto
  // que existe — ali ele é obrigatório.
  const podeSalvar = mode === 'add'
    ? Boolean(value.catalogId) || value.documento.trim().length > 0
    : Boolean(item?.doCatalogo) || value.documento.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Adicionar documento' : 'Editar documento'}</DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Escolha um documento do catálogo ou crie um novo. Vale apenas para esta solicitação.'
              : 'Ajuste o pedido deste documento. Vale apenas para esta solicitação.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <Field label="Grão">
            <Select
              value={value.granularidade}
              onValueChange={(grao) => trocarGrao(grao as Granularidade)}
            >
              <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRAOS_OFERECIDOS.map((grao) => (
                  <SelectItem key={grao} value={grao}>
                    {ROTULO_GRANULARIDADE[grao]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Grupo">
            <Select
              value={value.grupo}
              onValueChange={(grupo) => setValue((atual) => ({
                ...atual,
                grupo: grupo as GrupoDocumentoKey,
              }))}
            >
              <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRUPOS_DOCUMENTO.map((grupo) => (
                  <SelectItem key={grupo.key} value={grupo.key}>{grupo.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {mode === 'add' && (
            <Field label="Documento">
              <Select value={escolha} onValueChange={escolherDocumento}>
                <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOVO_DOCUMENTO}>Novo documento</SelectItem>
                  {doCatalogoNoGrao.map((documento) => (
                    <SelectItem key={documento.id} value={documento.id}>
                      {documento.documento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {(ehNovo || mode === 'edit') && (
            <Field label="Nome do documento">
              <Input
                value={value.documento}
                onChange={(event) => setValue((atual) => ({
                  ...atual,
                  documento: event.target.value,
                }))}
                placeholder="Ex.: Certidão de casamento atualizada"
                className={fieldCls}
              />
            </Field>
          )}

          <Field label="Orientação ao cliente">
            <Textarea
              value={value.nota}
              onChange={(event) => setValue((atual) => ({
                ...atual,
                nota: event.target.value,
              }))}
              placeholder="Explique o que o cliente deve enviar"
              className={`min-h-[60px] ${textareaCls}`}
            />
          </Field>

          {mode === 'edit' && item?.doCatalogo && (
            <p className="px-1 text-xs leading-relaxed text-slate-500">
              Deixar o nome ou a orientação em branco faz o texto voltar a vir do catálogo.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!podeSalvar}
            onClick={() => {
              onSave({ ...value, documento: value.documento.trim() });
              onOpenChange(false);
            }}
          >
            {mode === 'add' ? 'Adicionar' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
