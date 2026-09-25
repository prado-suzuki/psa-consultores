/**
 * Formulário de um perfil de IA do enriquecimento (`enriquecimento_perfil`).
 *
 * Só é responsável por COLETAR e VALIDAR: quem fala com o banco é o hook de
 * domínio, chamado pelo pai (`EnriquecimentoPerfisTab`) através de `onSalvar`.
 * As regras de validação e a montagem do `contrato_saida` são puras e moram em
 * `lib/enriquecimentoPerfis` — é lá que os testes as travam.
 *
 * O `nome` é chave de integração: o código chama o perfil por ele. Por isso é
 * livre na criação e BLOQUEADO na edição — renomear por aqui silenciaria todos
 * os chamadores do perfil sem aviso nenhum. O aviso no campo diz isso.
 */
import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  MODELO_PADRAO,
  lerContratoSaida,
  rascunhoDe,
  rascunhoVazio,
  temErros,
  validarRascunho,
  valoresDoRascunho,
  type ErrosDoRascunho,
  type PerfilEnriquecimento,
  type RascunhoDePerfil,
  type TipoDeSaida,
  type ValoresDoPerfil,
} from '@/lib/enriquecimentoPerfis';

interface PerfilEnriquecimentoFormProps {
  aberto: boolean;
  /** `null` abre o formulário em modo criação. */
  perfil: PerfilEnriquecimento | null;
  salvando: boolean;
  onSalvar: (valores: ValoresDoPerfil) => void;
  onFechar: () => void;
}

export function PerfilEnriquecimentoForm({
  aberto,
  perfil,
  salvando,
  onSalvar,
  onFechar,
}: PerfilEnriquecimentoFormProps) {
  const [rascunho, setRascunho] = useState<RascunhoDePerfil>(rascunhoVazio);
  const [erros, setErros] = useState<ErrosDoRascunho>({ errosDeCampo: {} });
  const editando = perfil !== null;

  // Reabrir o diálogo volta ao estado do registro — rascunho esquecido de uma
  // edição anterior não pode vazar para o próximo "Novo perfil".
  useEffect(() => {
    if (!aberto) return;
    setRascunho(perfil ? rascunhoDe(perfil) : rascunhoVazio());
    setErros({ errosDeCampo: {} });
  }, [aberto, perfil]);

  const campo = <K extends keyof RascunhoDePerfil>(chave: K, valor: RascunhoDePerfil[K]) =>
    setRascunho((atual) => ({ ...atual, [chave]: valor }));

  const limparErro = (chave: keyof Omit<ErrosDoRascunho, 'errosDeCampo'>) =>
    setErros((atual) => ({ ...atual, [chave]: undefined }));

  const alternarTipoDeSaida = (tipo: TipoDeSaida) => {
    setRascunho((atual) => {
      // Voltando para estruturada, recupera o que já havia: ler o contrato do
      // registro original evita perder campos só porque a pessoa mudou de aba.
      const campos =
        tipo === 'estruturada' && atual.campos.length === 0 && perfil
          ? lerContratoSaida(perfil.contrato_saida).campos
          : atual.campos;
      return { ...atual, tipoDeSaida: tipo, campos };
    });
    setErros((atual) => ({ ...atual, campos: undefined }));
  };

  const mudarCampoDeSaida = (indice: number, mudanca: Partial<{ nome: string; descricao: string }>) => {
    setRascunho((atual) => ({
      ...atual,
      campos: atual.campos.map((c, i) => (i === indice ? { ...c, ...mudanca } : c)),
    }));
    setErros((atual) => {
      const errosDeCampo = { ...atual.errosDeCampo };
      delete errosDeCampo[indice];
      return { ...atual, errosDeCampo };
    });
  };

  const adicionarCampo = () =>
    setRascunho((atual) => ({ ...atual, campos: [...atual.campos, { nome: '', descricao: '' }] }));

  const removerCampo = (indice: number) =>
    setRascunho((atual) => ({ ...atual, campos: atual.campos.filter((_, i) => i !== indice) }));

  const submeter = () => {
    const encontrados = validarRascunho(rascunho);
    setErros(encontrados);
    if (temErros(encontrados)) return;
    onSalvar(valoresDoRascunho(rascunho));
  };

  const erroDeCampo = (indice: number) => erros.errosDeCampo[indice];

  return (
    <Dialog open={aberto} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar perfil de IA' : 'Novo perfil de IA'}</DialogTitle>
          <DialogDescription>
            Configuração usada pela próxima chamada de enriquecimento — não é preciso republicar a
            Edge Function.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="perfil-nome">Nome técnico</Label>
            <Input
              id="perfil-nome"
              value={rascunho.nome}
              disabled={editando}
              onChange={(e) => {
                campo('nome', e.target.value);
                limparErro('nome');
              }}
              placeholder="ex.: comentario-para-tarefa"
              autoComplete="off"
            />
            {editando ? (
              <p className="text-xs text-muted-foreground">
                Fixo: o código chama o perfil por este nome. Renomear quebraria os chamadores.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                O código usa este valor para chamar o perfil. Somente letras minúsculas, números e
                hífens — e não pode mais mudar depois de criado.
              </p>
            )}
            {erros.nome && <p className="text-sm text-destructive">{erros.nome}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="perfil-rotulo">Rótulo</Label>
            <Input
              id="perfil-rotulo"
              value={rascunho.rotulo}
              onChange={(e) => {
                campo('rotulo', e.target.value);
                limparErro('rotulo');
              }}
              placeholder="ex.: Comentário para tarefa"
            />
            {erros.rotulo && <p className="text-sm text-destructive">{erros.rotulo}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="perfil-instrucoes">Instruções</Label>
            <Textarea
              id="perfil-instrucoes"
              value={rascunho.instrucoes}
              onChange={(e) => {
                campo('instrucoes', e.target.value);
                limparErro('instrucoes');
              }}
              rows={5}
              placeholder="O que o modelo deve fazer com o texto recebido."
            />
            {erros.instrucoes && <p className="text-sm text-destructive">{erros.instrucoes}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="perfil-modelo">Modelo</Label>
              <Input
                id="perfil-modelo"
                value={rascunho.modelo}
                onChange={(e) => {
                  campo('modelo', e.target.value);
                  limparErro('modelo');
                }}
                placeholder={MODELO_PADRAO}
                autoComplete="off"
              />
              {erros.modelo && <p className="text-sm text-destructive">{erros.modelo}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="perfil-temperatura">Temperatura (0 a 1)</Label>
              <Input
                id="perfil-temperatura"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={rascunho.temperatura}
                onChange={(e) => {
                  campo('temperatura', e.target.value);
                  limparErro('temperatura');
                }}
              />
              {erros.temperatura && <p className="text-sm text-destructive">{erros.temperatura}</p>}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Tipo de saída</Label>
            <RadioGroup
              value={rascunho.tipoDeSaida}
              onValueChange={(valor) => alternarTipoDeSaida(valor as TipoDeSaida)}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label
                htmlFor="tipo-texto"
                className="flex flex-1 cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3"
              >
                <RadioGroupItem value="texto" id="tipo-texto" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Texto único</span>
                  <span className="block text-xs text-muted-foreground">
                    Uma resposta em texto corrido.
                  </span>
                </span>
              </label>
              <label
                htmlFor="tipo-estruturada"
                className="flex flex-1 cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3"
              >
                <RadioGroupItem value="estruturada" id="tipo-estruturada" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Estruturada</span>
                  <span className="block text-xs text-muted-foreground">
                    Campos nomeados que o consumidor lê da resposta.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          {rascunho.tipoDeSaida === 'estruturada' && (
            <div className="grid gap-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Campos da saída</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={adicionarCampo}
                  disabled={salvando}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar campo
                </Button>
              </div>
              {erros.campos && <p className="text-sm text-destructive">{erros.campos}</p>}
              {rascunho.campos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum campo ainda. Cada campo vira uma chave da resposta estruturada.
                </p>
              )}
              {rascunho.campos.map((campoDeSaida, indice) => {
                const erro = erroDeCampo(indice);
                return (
                  <div key={indice} className="grid gap-2 md:grid-cols-[minmax(0,10rem)_1fr_auto]">
                    <div className="grid content-start gap-1">
                      <Input
                        value={campoDeSaida.nome}
                        onChange={(e) => mudarCampoDeSaida(indice, { nome: e.target.value })}
                        placeholder="nome_tecnico"
                        aria-label={`Nome técnico do campo ${indice + 1}`}
                        autoComplete="off"
                      />
                      {erro?.nome && <p className="text-xs text-destructive">{erro.nome}</p>}
                    </div>
                    <div className="grid content-start gap-1">
                      <Input
                        value={campoDeSaida.descricao}
                        onChange={(e) => mudarCampoDeSaida(indice, { descricao: e.target.value })}
                        placeholder="Descrição enviada ao modelo"
                        aria-label={`Descrição do campo ${indice + 1}`}
                        autoComplete="off"
                      />
                      {erro?.descricao && <p className="text-xs text-destructive">{erro.descricao}</p>}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removerCampo(indice)}
                      disabled={salvando}
                      aria-label={`Remover campo ${indice + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
            <div>
              <Label htmlFor="perfil-ativo">Perfil ativo</Label>
              <p className="text-xs text-muted-foreground">
                Perfis inativos fazem a chamada que citar o nome falhar.
              </p>
            </div>
            <Switch
              id="perfil-ativo"
              checked={rascunho.ativo}
              onCheckedChange={(valor) => campo('ativo', valor)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={submeter} disabled={salvando}>
            {salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando…' : 'Salvar perfil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
