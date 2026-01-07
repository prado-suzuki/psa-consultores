import { motion } from "framer-motion";

const milestones = [
  {
    year: "1990",
    title: "Início da Jornada",
    description: "Fundação da Prado Funaro, dando início à trajetória de excelência em consultoria tributária."
  },
  {
    year: "2004",
    title: "Expansão Regional",
    description: "Abertura do escritório na Bahia, ampliando a presença no agronegócio do Nordeste."
  },
  {
    year: "2012",
    title: "Nova Estrutura",
    description: "Consolidação como Prado Consultores e Prado Advogados, fortalecendo a atuação multidisciplinar."
  },
  {
    year: "2015",
    title: "Autonomia",
    description: "Estruturação de diretoria autônoma, focando em governança e gestão profissional."
  },
  {
    year: "2022",
    title: "Rede Associativa",
    description: "Formação da Rede PSA - Prado, Sá, Avila Consultores & Advogados."
  },
  {
    year: "2024",
    title: "Governança Corporativa",
    description: "Consolidação da governança corporativa com foco em inovação e tecnologia."
  }
];

export const TimelineSection = () => {
  return (
    <section className="py-20 md:py-32 bg-gray-900 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-50 mb-4">
            Nossa <span className="text-primary">Jornada</span>
          </h2>
          <p className="text-lg text-gray-400">
            Mais de três décadas construindo soluções tributárias e fortalecendo o agronegócio brasileiro.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Center Line - Desktop */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-secondary to-primary/30" />

          <div className="space-y-8 md:space-y-0">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.year}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative md:flex md:items-center ${
                  index % 2 === 0 ? 'md:justify-start' : 'md:justify-end'
                }`}
              >
                {/* Content Card */}
                <div className={`md:w-[45%] ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                  <div className="relative p-6 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-primary/50 transition-colors">
                    {/* Year Badge */}
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/20 text-primary font-bold text-lg mb-4">
                      {milestone.year}
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-50 mb-2">
                      {milestone.title}
                    </h3>
                    <p className="text-gray-400">
                      {milestone.description}
                    </p>
                  </div>
                </div>

                {/* Center Dot - Desktop */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-primary border-4 border-gray-900 z-10" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
