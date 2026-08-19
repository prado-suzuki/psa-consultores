import { BarChart2 } from 'lucide-react';

/** Estado vazio padrão dos cards de gráfico/tabela do dashboard Clientes e OS. */
export const ChartEmpty = ({ msg }: { msg: string }) => (
  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
    <BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: 'var(--board-v4-ink4)' }} />
    {msg}
  </div>
);
