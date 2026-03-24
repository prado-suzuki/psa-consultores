import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { DraftEntity } from '@/types/clientForm';

type EntitySetter = React.Dispatch<React.SetStateAction<Partial<DraftEntity>>> | React.Dispatch<React.SetStateAction<Partial<DraftEntity> | null>>;

export const useExternalConsults = () => {
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const handleCnpjBlur = useCallback(async (value: string, setter: EntitySetter) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      (setter as any)((prev: any) =>
        prev
          ? {
              ...prev,
              nome_razao_social: data.razao_social || prev.nome_razao_social || "",
              nome_fantasia: data.nome_fantasia || "",
              cod_cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : prev.cod_cnae || "",
              atividade_principal: data.cnae_fiscal_descricao || "",
              cep: data.cep ? String(data.cep).replace(/\D/g, "") : prev.cep || "",
              logradouro: data.logradouro || prev.logradouro || "",
              numero: data.numero || prev.numero || "",
              complemento: data.complemento || prev.complemento || "",
              bairro: data.bairro || prev.bairro || "",
              municipio: data.municipio || prev.municipio || "",
              uf: data.uf || prev.uf || "",
            }
          : prev,
      );
      toast.success("Dados preenchidos via CNPJ");
    } catch {
      toast.error("CNPJ não encontrado na base federal");
    } finally {
      setCnpjLoading(false);
    }
  }, []);

  const handleCepBlur = useCallback(async (value: string, setter: EntitySetter) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("not found");
      (setter as any)((prev: any) =>
        prev
          ? {
              ...prev,
              logradouro: data.logradouro || prev.logradouro || "",
              bairro: data.bairro || prev.bairro || "",
              municipio: data.localidade || prev.municipio || "",
              uf: data.uf || prev.uf || "",
            }
          : prev,
      );
      toast.success("Endereço preenchido via CEP");
    } catch {
      toast.error("CEP não encontrado");
    } finally {
      setCepLoading(false);
    }
  }, []);

  return { handleCnpjBlur, handleCepBlur, cnpjLoading, cepLoading };
};
