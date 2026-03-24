import { Building2 } from "lucide-react";
import type { DraftEntity } from "@/types/clientForm";

export interface FaturamentoTabProps {
  entities: DraftEntity[];
}

export default function FaturamentoTab({ entities }: FaturamentoTabProps) {
  const faturamentoEntity = entities.find((e) => e.contribuinte_faturamento) || entities[0];

  if (!faturamentoEntity) {
    return (
      <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 border-b">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Dados de Faturamento
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-gray-300" />
          </div>
          <h4 className="text-base font-semibold text-gray-900 mb-2">
            Nenhum contribuinte cadastrado
          </h4>
          <p className="text-gray-500 text-sm max-w-sm">
            Os dados de faturamento serão exibidos aqui após o cadastro de um contribuinte marcado
            para faturamento.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          Dados de Faturamento
        </h3>
      </div>
      <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
        <div className="space-y-5">
          <div>
            <dt className="text-sm font-medium text-gray-500">Razão Social</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {faturamentoEntity.nome_razao_social || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">CPF / CNPJ</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900 font-mono">
              {faturamentoEntity.cpf_cnpj || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Inscrição Estadual</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {faturamentoEntity.inscricao_estadual || "Isento"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Telefone</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {faturamentoEntity.telefone || "—"}
            </dd>
          </div>
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">CEP</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900 font-mono">
                {faturamentoEntity.cep || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Número</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {faturamentoEntity.numero || "—"}
              </dd>
            </div>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Endereço</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {faturamentoEntity.logradouro}
              {faturamentoEntity.complemento ? `, ${faturamentoEntity.complemento}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Bairro</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {faturamentoEntity.bairro || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Cidade / UF</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {faturamentoEntity.municipio || "—"}
              {faturamentoEntity.uf ? ` / ${faturamentoEntity.uf}` : ""}
            </dd>
          </div>
        </div>
      </div>
    </section>
  );
}
