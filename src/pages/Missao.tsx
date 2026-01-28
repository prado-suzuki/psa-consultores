import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import psaChevron from "@/assets/icons/psa-chevron.png";

const valores = [
  {
    titulo: "Ética e Integridade",
    descricao: "Transparência e honestidade em todas as relações profissionais.",
  },
  {
    titulo: "Excelência Técnica",
    descricao: "Conhecimento profundo e atualização constante em legislação tributária.",
  },
  {
    titulo: "Foco no Cliente",
    descricao: "Soluções personalizadas para a realidade de cada empresa familiar.",
  },
  {
    titulo: "Inovação",
    descricao: "Tecnologia e metodologias modernas a serviço da eficiência tributária.",
  },
  {
    titulo: "Compromisso",
    descricao: "Responsabilidade genuína com os resultados e o sucesso dos clientes.",
  },
];

const Missao = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Missão, Visão e Valores
            </h1>
            <p className="text-lg text-gray-300">
              Os princípios que guiam nossa atuação há mais de 20 anos no agronegócio brasileiro.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Missão Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <img src={psaChevron} alt="" className="h-8 w-8 object-contain" />
              <h2 className="text-3xl font-bold text-gray-900">Missão</h2>
            </div>
            <p className="text-xl text-gray-600 leading-relaxed">
              Transformar a complexidade tributária em vantagem competitiva para empresas familiares 
              do agronegócio, oferecendo soluções personalizadas que protegem patrimônios e perpetuam legados.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Vídeo Institucional */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <div className="aspect-video rounded-lg overflow-hidden shadow-lg border border-gray-200">
              <iframe
                src="https://www.youtube.com/embed/9E-EcRz-Gig"
                title="PSA Consultores"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Visão Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <img src={psaChevron} alt="" className="h-8 w-8 object-contain" />
              <h2 className="text-3xl font-bold text-gray-900">Visão</h2>
            </div>
            <p className="text-xl text-gray-600 leading-relaxed">
              Ser reconhecida como uma empresa de referência na produção de conhecimento e na sua aplicação de forma inovadora no agronegócio brasileiro.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Valores Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <img src={psaChevron} alt="" className="h-8 w-8 object-contain" />
              <h2 className="text-3xl font-bold text-gray-900">Valores</h2>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] text-gray-900 font-semibold">Valor</TableHead>
                  <TableHead className="text-gray-900 font-semibold">Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valores.map((valor) => (
                  <TableRow key={valor.titulo}>
                    <TableCell className="font-medium text-gray-900">{valor.titulo}</TableCell>
                    <TableCell className="text-gray-600">{valor.descricao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Missao;
