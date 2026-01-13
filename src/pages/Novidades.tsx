import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NovidadeEntry, CategoriaType } from "@/components/novidades/NovidadeEntry";
import { motion } from "framer-motion";

interface NovidadeData {
  id: string;
  categoria: CategoriaType;
  data: string;
  titulo: string;
  descricao: string;
  itens?: string[];
  imagem?: string;
  botao?: {
    texto: string;
    url: string;
  };
}

// Mock data - será substituído por dados do banco posteriormente
const novidades: NovidadeData[] = [
  {
    id: "1",
    categoria: "cases",
    data: "10 de Janeiro, 2025",
    titulo: "Recuperação de R$ 15 milhões em créditos tributários",
    descricao:
      "Nossa equipe concluiu com sucesso um projeto de revisão fiscal para uma grande indústria do setor alimentício, resultando na identificação e recuperação de créditos tributários não aproveitados nos últimos 5 anos.",
    itens: [
      "Análise completa de ICMS-ST dos últimos 60 meses",
      "Identificação de créditos de PIS/COFINS sobre insumos",
      "Recuperação administrativa sem necessidade de ação judicial",
      "Prazo de execução de 4 meses",
    ],
    imagem: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop",
    botao: {
      texto: "Conhecer nossos serviços",
      url: "/#servicos",
    },
  },
  {
    id: "2",
    categoria: "tributario",
    data: "8 de Janeiro, 2025",
    titulo: "Novas regras do ICMS para 2025: O que sua empresa precisa saber",
    descricao:
      "O Conselho Nacional de Política Fazendária (CONFAZ) publicou novos convênios que alteram significativamente a tributação do ICMS em operações interestaduais. Confira as principais mudanças.",
    itens: [
      "Alteração nas alíquotas interestaduais para produtos eletrônicos",
      "Novas regras de substituição tributária para o setor de cosméticos",
      "Mudanças no diferencial de alíquotas (DIFAL) para e-commerce",
      "Prazos para adequação: até março de 2025",
    ],
    botao: {
      texto: "Falar com especialista",
      url: "mailto:contato@psaconsultores.com.br",
    },
  },
  {
    id: "3",
    categoria: "servicos",
    data: "3 de Janeiro, 2025",
    titulo: "Novo serviço: Consultoria em ESG Tributário",
    descricao:
      "A PSA Consultores lança seu mais novo serviço especializado em ESG Tributário, auxiliando empresas a alinharem suas práticas fiscais com critérios de sustentabilidade e governança corporativa.",
    itens: [
      "Mapeamento de benefícios fiscais para práticas sustentáveis",
      "Adequação à Taxonomia Verde Brasileira",
      "Compliance tributário para relatórios ESG",
      "Incentivos fiscais para economia circular",
    ],
    imagem: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&h=450&fit=crop",
    botao: {
      texto: "Saiba mais",
      url: "/#servicos",
    },
  },
  {
    id: "4",
    categoria: "empresa",
    data: "20 de Dezembro, 2024",
    titulo: "PSA expande atuação para a Bahia",
    descricao:
      "Com orgulho anunciamos a abertura de nosso novo escritório em Salvador, fortalecendo nossa presença no Nordeste brasileiro. A nova unidade conta com uma equipe especializada para atender às demandas regionais.",
    itens: [
      "Localização estratégica no centro empresarial de Salvador",
      "Equipe de 8 consultores especializados",
      "Foco em indústrias e comércio exterior",
      "Atendimento presencial e remoto para todo o Nordeste",
    ],
    imagem: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=450&fit=crop",
  },
];

const Novidades = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 pt-24 pb-20 md:pb-28">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Novidades
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Fique por dentro das últimas atualizações da PSA Consultores, 
              mudanças no sistema tributário brasileiro e nossos cases de sucesso.
            </p>
          </motion.div>

          {/* Timeline */}
          <div className="space-y-16 md:pl-8">
            {novidades.map((novidade) => (
              <NovidadeEntry
                key={novidade.id}
                categoria={novidade.categoria}
                data={novidade.data}
                titulo={novidade.titulo}
                descricao={novidade.descricao}
                itens={novidade.itens}
                imagem={novidade.imagem}
                botao={novidade.botao}
              />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Novidades;
