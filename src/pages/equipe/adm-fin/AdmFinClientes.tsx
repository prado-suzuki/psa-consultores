import { AdmFinLayout } from '@/components/equipe/adm-fin/AdmFinLayout';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';

// Clientes da Adm & Fin — o MESMO conteúdo compartilhado que a Tax e a OSG
// montam (`<GestaoClientesContent />`), no layout desta área.
//
// `todosOsClusters` é a única diferença, e ela é de negócio: a Adm & Fin fatura
// para o grupo inteiro, então recortar pelo cluster dela mostraria uma lista
// vazia — o cluster PRADO SUZUKI não tem OS nenhuma (medido em produção,
// 14/09/2026: as 155 OS estão em PSA CONSULTORIA, PSA Consultores e outros).
const AdmFinClientes = () => (
  <AdmFinLayout title="Clientes" subtitle="Cadastros de clientes e contribuintes">
    <GestaoClientesContent area="adm_fin" todosOsClusters />
  </AdmFinLayout>
);

export default AdmFinClientes;
