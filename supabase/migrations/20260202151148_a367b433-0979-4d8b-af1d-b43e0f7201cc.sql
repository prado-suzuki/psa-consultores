-- Tabela PER (Pedido Eletrônico de Restituição)
CREATE TABLE public.per (
  numero_processo_per VARCHAR(50) PRIMARY KEY,
  exercicio INTEGER NOT NULL,
  tri_exercicio INTEGER NOT NULL CHECK (tri_exercicio BETWEEN 1 AND 4),
  dt_solicitada DATE NOT NULL,
  tp_credito VARCHAR(50) NOT NULL,
  vlr_credito DECIMAL(15,2) NOT NULL,
  nr_proc_ret VARCHAR(50) REFERENCES public.per(numero_processo_per),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Tabela PER_SITUACAO (histórico de situações)
CREATE TABLE public.per_situacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nr_proc_per VARCHAR(50) NOT NULL REFERENCES public.per(numero_processo_per) ON DELETE CASCADE,
  situacao VARCHAR(50) NOT NULL,
  dt_pagamento DATE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Tabela DCOMP (Declaração de Compensação)
CREATE TABLE public.dcomp (
  nr_documento VARCHAR(50) PRIMARY KEY,
  nr_per_orig VARCHAR(50) NOT NULL REFERENCES public.per(numero_processo_per),
  mes_ano_exercicio DATE NOT NULL,
  dt_envio DATE NOT NULL,
  imposto VARCHAR(20) NOT NULL,
  tp_credito VARCHAR(50) NOT NULL,
  vlr_compensado DECIMAL(15,2) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_per_nr_proc_ret ON public.per(nr_proc_ret);
CREATE INDEX idx_per_situacao_nr_proc_per ON public.per_situacao(nr_proc_per);
CREATE INDEX idx_per_situacao_criado_em ON public.per_situacao(nr_proc_per, criado_em DESC);
CREATE INDEX idx_dcomp_nr_per_orig ON public.dcomp(nr_per_orig);

-- Habilitar RLS
ALTER TABLE public.per ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_situacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcomp ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para PER
CREATE POLICY "Team members can view per"
  ON public.per FOR SELECT
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create per"
  ON public.per FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update per"
  ON public.per FOR UPDATE
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete per"
  ON public.per FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Políticas RLS para PER_SITUACAO
CREATE POLICY "Team members can view per_situacao"
  ON public.per_situacao FOR SELECT
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create per_situacao"
  ON public.per_situacao FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update per_situacao"
  ON public.per_situacao FOR UPDATE
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete per_situacao"
  ON public.per_situacao FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Políticas RLS para DCOMP
CREATE POLICY "Team members can view dcomp"
  ON public.dcomp FOR SELECT
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create dcomp"
  ON public.dcomp FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update dcomp"
  ON public.dcomp FOR UPDATE
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete dcomp"
  ON public.dcomp FOR DELETE
  USING (has_role(auth.uid(), 'admin'));