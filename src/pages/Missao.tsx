import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Target, Eye, Heart, Shield, Award, Users, Lightbulb, Handshake } from "lucide-react";

const valores = [
  {
    icone: Shield,
    titulo: "Ética e Integridade",
    descricao: "Transparência e honestidade em todas as relações profissionais.",
  },
  {
    icone: Award,
    titulo: "Excelência Técnica",
    descricao: "Conhecimento profundo e atualização constante em legislação tributária.",
  },
  {
    icone: Users,
    titulo: "Foco no Cliente",
    descricao: "Soluções personalizadas para a realidade de cada empresa familiar.",
  },
  {
    icone: Lightbulb,
    titulo: "Inovação",
    descricao: "Tecnologia e metodologias modernas a serviço da eficiência tributária.",
  },
  {
    icone: Handshake,
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
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Missão</h2>
            </div>
            <p className="text-xl text-gray-600 leading-relaxed pl-20">
              Transformar a complexidade tributária em vantagem competitiva para empresas familiares 
              do agronegócio, oferecendo soluções personalizadas que protegem patrimônios e perpetuam legados.
            </p>
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
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Visão</h2>
            </div>
            <p className="text-xl text-gray-600 leading-relaxed pl-20">
              Ser a consultoria tributária mais confiável e inovadora para o agronegócio brasileiro, 
              reconhecida pela excelência técnica e pelo compromisso genuíno com o sucesso de nossos clientes.
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
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Valores</h2>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {valores.map((valor, index) => (
              <motion.div
                key={valor.titulo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
                  <valor.icone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {valor.titulo}
                </h3>
                <p className="text-gray-600">
                  {valor.descricao}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Missao;
