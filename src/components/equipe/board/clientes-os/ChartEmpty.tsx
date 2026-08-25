/** Estado vazio padrão dos cards de gráfico/tabela do dashboard Clientes e OS.
 *  Sem ícone decorativo: o ícone de gráfico vazio repetido em oito cards lia
 *  como "carregando", e a frase já diz o que falta. */
export const ChartEmpty = ({ msg }: { msg: string }) => (
  <div className="v4-card-empty">{msg}</div>
);
