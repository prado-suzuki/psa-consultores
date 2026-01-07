import { motion } from "framer-motion";

const clients = [
  { name: "Rodolider", logo: null },
  { name: "Agrológica", logo: null },
  { name: "Tecnomyl", logo: null },
  { name: "Fribon", logo: null },
  { name: "Araujo", logo: null },
  { name: "Agroamazônia", logo: null },
  { name: "Bioenergia", logo: null },
  { name: "Transports", logo: null }
];

export const ClientsSection = () => {
  return (
    <section className="py-20 md:py-24 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Empresas que <span className="text-primary">Confiam</span> na PSA
          </h2>
          <p className="text-gray-600">
            Atendemos empresas de médio e grande porte em todo o Brasil, 
            desde produtores rurais até grandes indústrias do agronegócio.
          </p>
        </motion.div>

        {/* Clients Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {clients.map((client, index) => (
            <motion.div
              key={client.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex items-center justify-center p-6 md:p-8 rounded-xl bg-gray-50 border border-gray-100 hover:border-primary/30 hover:bg-gray-100/50 transition-all group"
            >
              {/* Placeholder for logos - using text for now */}
              <span className="text-lg md:text-xl font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
                {client.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-sm text-gray-500 mt-12"
        >
          +500 clientes atendidos em todo o território nacional
        </motion.p>
      </div>
    </section>
  );
};
