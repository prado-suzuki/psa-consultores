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
import { RequiredMark } from '@/components/ui/required-mark';
import { GRUPOS_DOCUMENTO, type GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';
import {
  GRAOS_DE_BENS_IMOVEIS,
  graoSugeridoParaGrupo,
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
  /**
   * Com um produto selecionado no rail, só o catálogo dele é oferecido.
   *
   * Isso muda o que aparece, nunca o que é gravado: o documento entra na
   * solicitação e volta a aparecer sob todos os produtos que o pedem.
   */
  documentosDoProduto?: Set<string>;
  /**
   * A gaveta em que o modal abre, quando há uma expandida na tela.
   *
   * Adicionar documento é ação de gaveta, não da página: o analista clica dentro
   * de "Pessoas Físicas" e o modal já vem nela — inclusive a lista de escolha,
   * que é filtrada pela gaveta. Sem isso ele caía sempre em "Outros documentos"
   * e tinha de reencontrar a gaveta de onde acabou de sair.
   */
  grupoInicial?: GrupoDocumentoKey;
  onSave: (value: DocumentEditorValue) => void;
}

const NOVO_DOCUMENTO = '__novo__';

const GRUPO_PADRAO: GrupoDocumentoKey = 'outros';

/**
 * O que o formulário segura enquanto está aberto.
 *
 * `granularidade` é opcional só aqui: em "Bens e Imóveis" ela nasce vazia e o
 * analista precisa escolher. No banco a coluna é NOT NULL, e é o `podeSalvar`
 * que garante que nada sai daqui sem grão.
 */
interface EstadoEditor extends Omit<DocumentEditorValue, 'granularidade'> {
  granularidade?: Granularidade;
}

const valorVazio = (grupo: GrupoDocumentoKey = GRUPO_PADRAO): EstadoEditor => ({
  documento: '',
  nota: '',
  grupo,
  granularidade: graoSugeridoParaGrupo(grupo) ?? undefined,
});

/** Campo no padrão dos modais OSG: rótulo miúdo + controle com foco verde-musgo. */
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={labelCls}>{label}{required && <RequiredMark />}</Label>
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
  documentosDoProduto,
  grupoInicial,
  onSave,
}: DocumentEditorDialogProps) {
  const [value, setValue] = useState<EstadoEditor>(valorVazio);
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
      : valorVazio(grupoInicial));
  }, [grupoInicial, item, open]);

  /** A lista de escolha respeita a gaveta e esconde o que já foi pedido. */
  const doCatalogoNaGaveta = useMemo(
    () => catalogo
      .filter((documento) =>
        documento.grupo === value.grupo
        && !idsJaPedidos.has(documento.id)
        && (!documentosDoProduto || documentosDoProduto.has(documento.id)))
      .sort((esquerda, direita) =>
        esquerda.documento.localeCompare(direita.documento, 'pt-BR')),
    [catalogo, documentosDoProduto, idsJaPedidos, value.grupo],
  );

  /**
   * Trocar a gaveta re-sugere o grão — e só sugere.
   *
   * A gaveta vem primeiro porque é a organização que o cliente vê do outro lado.
   * O grão continua editável porque `bens_imoveis` não tem grão único: abriga
   * matrícula rural, urbana e bem.
   */
  const trocarGrupo = (grupo: GrupoDocumentoKey) => {
    setEscolha(NOVO_DOCUMENTO);
    setValue((atual) => {
      // O texto do catálogo pertence ao documento escolhido, então cai junto com
      // a escolha. O que o analista digitou é dele: trocar de gaveta não pode
      // apagar o nome e a orientação que ele já escreveu.
      const veioDoCatalogo = Boolean(atual.catalogId);

      return {
        ...atual,
        grupo,
        // Nas três gavetas em que o grão é consequência, ele é preenchido e nem
        // aparece. Em "Bens e Imóveis" volta a vazio para o analista escolher.
        granularidade: graoSugeridoParaGrupo(grupo) ?? undefined,
        catalogId: undefined,
        documento: veioDoCatalogo ? '' : atual.documento,
        nota: veioDoCatalogo ? '' : atual.nota,
      };
    });
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
  /**
   * O nome é obrigatório quando é o único texto que existe: documento novo, ou
   * item manual sendo editado. No item de catálogo em edição, deixar em branco é
   * legítimo — significa voltar a herdar o nome do catálogo.
   */
  const nomeObrigatorio = mode === 'add' ? ehNovo : !item?.doCatalogo;
  // No modo editar de um item de catálogo, nome vazio é legítimo: significa
  // voltar a herdar o texto do catálogo. No item manual, o nome é o único texto
  // que existe — ali ele é obrigatório.
  const temNome = mode === 'add'
    ? Boolean(value.catalogId) || value.documento.trim().length > 0
    : Boolean(item?.doCatalogo) || value.documento.trim().length > 0;
  // `granularidade` é NOT NULL no banco: sem grão escolhido não se salva.
  const podeSalvar = temNome && Boolean(value.granularidade);

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
          <Field label="Grupo" required>
            <Select
              value={value.grupo}
              onValueChange={(grupo) => trocarGrupo(grupo as GrupoDocumentoKey)}
            >
              <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRUPOS_DOCUMENTO.map((grupo) => (
                  <SelectItem key={grupo.key} value={grupo.key}>{grupo.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/*
            O grão só é perguntado onde a gaveta não o determina. Em Pessoas
            Físicas, Pessoas Jurídicas e Outros documentos ele é consequência
            direta e é gravado sem ocupar espaço na tela.
          */}
          {value.grupo === 'bens_imoveis' && (
            <Field label="Grão" required>
              <Select
                value={value.granularidade ?? ''}
                onValueChange={(grao) => setValue((atual) => ({
                  ...atual,
                  granularidade: grao as Granularidade,
                }))}
              >
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {GRAOS_DE_BENS_IMOVEIS.map((grao) => (
                    <SelectItem key={grao} value={grao}>
                      {ROTULO_GRANULARIDADE[grao]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {mode === 'add' && (
            <Field label="Documento">
              <Select value={escolha} onValueChange={escolherDocumento}>
                <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOVO_DOCUMENTO}>Novo documento</SelectItem>
                  {doCatalogoNaGaveta.map((documento) => (
                    <SelectItem key={documento.id} value={documento.id}>
                      {documento.documento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {(ehNovo || mode === 'edit') && (
            <Field label="Nome do documento" required={nomeObrigatorio}>
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
              if (!value.granularidade) return;
              onSave({
                ...value,
                granularidade: value.granularidade,
                documento: value.documento.trim(),
              });
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
