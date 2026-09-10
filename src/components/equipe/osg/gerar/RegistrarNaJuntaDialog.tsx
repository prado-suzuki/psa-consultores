import { useEffect, useMemo, useRef, useState } from 'react';
import { FileCheck2, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Campo, fieldCls } from '@/components/equipe/osg/formKit';
import type { DadosDoRegistro } from '@/hooks/useGerarDocumentoController';
import type { RegistroContratual } from '@/hooks/useDocumentoGerado';

interface RegistrarNaJuntaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomeModelo: string;
  /**
   * `registrar` é o gesto que trava a peça; `completar` só preenche o marco de
   * uma peça que já foi à junta, e é o mesmo formulário porque são os mesmos
   * campos, vindos do mesmo papel.
   */
  modo: 'registrar' | 'completar';
  /** UF da junta do cadastro da sociedade, como sugestão. */
  juntaUfPadrao?: string | null;
  /** O marco já gravado, quando se está completando. */
  registroAtual?: RegistroContratual | null;
  /** O PDF já subiu (tentativa anterior, ou registro já feito): não se pede outro. */
  arquivoJaEnviado: boolean;
  salvando: boolean;
  onConfirmar: (dados: DadosDoRegistro) => void;
}

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const VAZIO: DadosDoRegistro = {
  protocolo: '', dataRegistro: '', numeroArquivamento: '', juntaUf: '', junta: '', arquivo: null,
};

/** Os OPCIONAIS, para a linha do que vai ficar em branco. */
const OPCIONAIS: Array<[keyof Omit<DadosDoRegistro, 'arquivo'>, string]> = [
  ['numeroArquivamento', 'número do arquivamento'],
  ['juntaUf', 'UF'],
  ['junta', 'junta comercial'],
];

/**
 * O MARCO do registro na junta. Registrar deixou de ser um "sim" num alerta:
 * a peça registrada precisa dizer QUAL registro a tornou oponível, e cada campo
 * aqui é uma coisa distinta do NIRE da sociedade: protocolo é o pedido à junta,
 * arquivamento é o número que ela deu ao ato, e a data do registro é a do
 * deferimento.
 *
 * Obrigatórios, só dois: PROTOCOLO e DATA DO REGISTRO, que são o que identifica
 * o registro. O arquivamento, a junta, a UF e o PDF chancelado ficam para
 * depois, porque a junta devolve cada coisa num dia, e exigi-los no gesto
 * obrigava a inventar valor ou a atrasar o marco do ato. O que estiver em branco
 * fica em branco (a chave nem é gravada) e é preenchido depois, por este mesmo
 * diálogo em modo `completar`, pela lista "Registros na junta" do rail.
 *
 * A data do instrumento e a data do protocolo SAÍRAM em 09/09/2026: ninguém as
 * lia (nem a linhagem das ACs, que é de coluna) e eram duas conferências a mais
 * na guia da junta. Peça registrada antes disso pode carregá-las no jsonb; o
 * formulário não as mostra e não as regrava.
 *
 * O PDF é o arquivo que a junta DEVOLVEU, com a chancela: é a evidência exata
 * do que foi registrado, e não se promete reproduzi-lo rodando o motor de novo.
 * Ele sobe antes do registro (upload não cabe na transação do banco) e fica
 * vinculado à peça; se o registro falhar depois, o retry reaproveita o arquivo.
 * Eleito, não troca mais: o banco recusa.
 */
export const RegistrarNaJuntaDialog = ({
  open,
  onOpenChange,
  nomeModelo,
  modo,
  juntaUfPadrao,
  registroAtual,
  arquivoJaEnviado,
  salvando,
  onConfirmar,
}: RegistrarNaJuntaDialogProps) => {
  const [dados, setDados] = useState<DadosDoRegistro>(VAZIO);
  const arquivoRef = useRef<HTMLInputElement>(null);

  // Abrir carrega o marco já gravado (quando há) e sugere a junta pelo cadastro
  // da sociedade. O arquivo não é preservado entre aberturas: quem fecha e
  // reabre escolhe de novo.
  useEffect(() => {
    if (!open) return;
    const uf = (registroAtual?.juntaUf ?? juntaUfPadrao ?? '').toUpperCase();
    setDados({
      protocolo: registroAtual?.protocolo ?? '',
      dataRegistro: registroAtual?.dataRegistro ?? '',
      numeroArquivamento: registroAtual?.numeroArquivamento ?? '',
      juntaUf: UFS.includes(uf) ? uf : '',
      junta: registroAtual?.junta ?? (UFS.includes(uf) ? `JUCE${uf}` : ''),
      arquivo: null,
    });
  }, [open, juntaUfPadrao, registroAtual]);

  const set = <K extends keyof DadosDoRegistro>(chave: K, valor: DadosDoRegistro[K]) =>
    setDados((prev) => ({ ...prev, [chave]: valor }));

  // O que o banco recusa, dito antes de ir até ele. Campo opcional em branco não
  // é erro; campo incoerente é.
  const problema = useMemo(() => {
    if (dados.juntaUf.trim() && !UFS.includes(dados.juntaUf.trim().toUpperCase())) return 'Essa UF não existe.';
    if (dados.dataRegistro && dados.dataRegistro > new Date().toISOString().slice(0, 10)) {
      return 'A data do registro não pode estar no futuro.';
    }
    return null;
  }, [dados]);
  // O que vai ficar em branco, dito antes do gesto: deixar o arquivamento e o
  // PDF para depois é deliberado, e o consultor tem de saber o que está adiando.
  const faltando = useMemo(() => {
    const nomes = OPCIONAIS.filter(([chave]) => !dados[chave].trim()).map(([, nome]) => nome);
    if (!arquivoJaEnviado && !dados.arquivo) nomes.push('PDF registrado');
    return nomes;
  }, [dados, arquivoJaEnviado]);
  const completando = modo === 'completar';
  // Os dois que identificam o registro: sem eles a peça não diria qual ato a
  // tornou oponível, e é o mínimo que a trigger cobra.
  const temOMinimo = !!dados.protocolo.trim() && !!dados.dataRegistro.trim();
  const podeConfirmar = temOMinimo && !problema && !salvando;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-osg-moss" />
            {completando ? 'Dados do registro na junta' : 'Registrar na junta'}
          </DialogTitle>
          <DialogDescription>
            {completando ? (
              <>
                O marco do registro de <span className="font-medium text-foreground">{nomeModelo}</span>, que
                já foi à junta. É o único dado que a peça registrada ainda aceita: o texto, os blocos e a
                linhagem seguem travados. Preencha o que a junta já devolveu e volte quando tiver o resto.
              </>
            ) : (
              <>
                Marca que <span className="font-medium text-foreground">{nomeModelo}</span> foi registrado e
                trava a peça: ela deixa de aceitar edição de bloco, nova versão e re-sincronia do cadastro. A
                partir daí, a forma de mudar a sociedade é gerar uma alteração contratual a partir dela.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo rotulo="Protocolo na junta" htmlFor="registro-protocolo" required>
            <Input
              id="registro-protocolo"
              className={fieldCls}
              value={dados.protocolo}
              onChange={(e) => set('protocolo', e.target.value)}
              disabled={salvando}
            />
          </Campo>
          <Campo rotulo="Data do registro" htmlFor="registro-data-registro" required>
            <Input
              id="registro-data-registro"
              type="date"
              className={fieldCls}
              value={dados.dataRegistro}
              onChange={(e) => set('dataRegistro', e.target.value)}
              disabled={salvando}
            />
          </Campo>
          <Campo rotulo="Número do arquivamento" htmlFor="registro-arquivamento">
            <Input
              id="registro-arquivamento"
              className={fieldCls}
              value={dados.numeroArquivamento}
              onChange={(e) => set('numeroArquivamento', e.target.value)}
              disabled={salvando}
            />
          </Campo>
          <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
            <Campo rotulo="UF" htmlFor="registro-junta-uf">
              <Input
                id="registro-junta-uf"
                className={fieldCls}
                maxLength={2}
                value={dados.juntaUf}
                onChange={(e) => {
                  const uf = e.target.value.toUpperCase();
                  set('juntaUf', uf);
                  if (UFS.includes(uf) && (!dados.junta || /^JUCE[A-Z]{2}$/.test(dados.junta))) set('junta', `JUCE${uf}`);
                }}
                disabled={salvando}
              />
            </Campo>
            <Campo rotulo="Junta comercial" htmlFor="registro-junta">
              <Input
                id="registro-junta"
                className={fieldCls}
                value={dados.junta}
                onChange={(e) => set('junta', e.target.value)}
                disabled={salvando}
              />
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <Campo rotulo="PDF registrado (o arquivo que a junta devolveu)" htmlFor="registro-arquivo">
              {arquivoJaEnviado ? (
                <p className="flex items-center gap-1.5 text-xs text-osg-700">
                  <FileCheck2 className="h-3.5 w-3.5 text-osg-moss" />
                  {completando
                    ? 'O PDF chancelado já está anexado a esta peça e não troca mais.'
                    : 'Arquivo já enviado na tentativa anterior: será reaproveitado.'}
                </p>
              ) : (
                <Input
                  id="registro-arquivo"
                  ref={arquivoRef}
                  type="file"
                  accept="application/pdf"
                  className={fieldCls}
                  onChange={(e) => set('arquivo', e.target.files?.[0] ?? null)}
                  disabled={salvando}
                />
              )}
            </Campo>
          </div>
        </div>

        {problema && <p className="text-xs text-destructive">{problema}</p>}
        {!problema && !temOMinimo && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            O protocolo e a data do registro identificam o ato na junta: sem os dois a peça não diz qual
            registro a tornou oponível.
          </p>
        )}
        {!problema && temOMinimo && faltando.length > 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Fica sem {faltando.join(', ')}.
            {completando
              ? ' Você pode voltar aqui quando a junta devolver o que falta.'
              : ' O registro vale assim, e o que falta se completa depois, em "Registros na junta".'}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirmar(dados)} disabled={!podeConfirmar}>
            {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {completando ? 'Salvar dados do registro' : 'Registrar na junta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
