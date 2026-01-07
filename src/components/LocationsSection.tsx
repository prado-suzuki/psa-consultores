import { motion } from "framer-motion";
import { MapPin, Building2, Phone } from "lucide-react";

const offices = [
  {
    city: "Cuiabá",
    state: "MT",
    type: "Matriz",
    description: "Sede estratégica no polo do agronegócio brasileiro, com estrutura de 1.100m² para atendimento especializado.",
    address: "Rua Des. José Barros do Vale, 03",
    neighborhood: "Bairro Duque de Caxias",
    cep: "CEP 78043-292",
    phone: "+55 (65) 3622-2426",
    highlight: true
  },
  {
    city: "Barreiras",
    state: "BA",
    type: "Filial",
    description: "Atendimento regional para o agronegócio do Oeste Baiano e região MATOPIBA.",
    address: "Endereço disponível sob consulta",
    neighborhood: "",
    cep: "",
    phone: "",
    highlight: false
  },
  {
    city: "Curitiba",
    state: "PR",
    type: "Filial",
    description: "Presença estratégica no Sul do Brasil para atendimento às cooperativas e empresas da região.",
    address: "Endereço disponível sob consulta",
    neighborhood: "",
    cep: "",
    phone: "",
    highlight: false
  }
];

export const LocationsSection = () => {
  return (
    <section className="py-20 md:py-32 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Onde <span className="text-primary">Estamos</span>
          </h2>
          <p className="text-lg text-gray-600">
            Presença estratégica nos principais polos do agronegócio brasileiro, 
            com estrutura completa para atendimento presencial e remoto.
          </p>
        </motion.div>

        {/* Offices Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {offices.map((office, index) => (
            <motion.div
              key={office.city}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative p-8 rounded-2xl transition-all duration-300 ${
                office.highlight
                  ? 'bg-gray-900 text-gray-50 border-2 border-primary'
                  : 'bg-white text-gray-900 border border-gray-200 hover:border-primary/50'
              }`}
            >
              {/* Type Badge */}
              {office.highlight && (
                <div className="absolute -top-3 left-6 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  Matriz
                </div>
              )}

              {/* Icon */}
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center mb-6 ${
                office.highlight ? 'bg-primary/20' : 'bg-primary/10'
              }`}>
                <Building2 className="h-7 w-7 text-primary" />
              </div>

              {/* City & State */}
              <h3 className="text-2xl font-bold mb-2">
                {office.city}
                <span className={office.highlight ? 'text-gray-400' : 'text-gray-500'}>/{office.state}</span>
              </h3>

              {/* Description */}
              <p className={`mb-6 ${office.highlight ? 'text-gray-300' : 'text-gray-600'}`}>
                {office.description}
              </p>

              {/* Address Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className={`h-5 w-5 flex-shrink-0 mt-0.5 ${office.highlight ? 'text-primary' : 'text-gray-400'}`} />
                  <div className={`text-sm ${office.highlight ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div>{office.address}</div>
                    {office.neighborhood && <div>{office.neighborhood}</div>}
                    {office.cep && <div>{office.cep}</div>}
                  </div>
                </div>

                {office.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span className={`text-sm font-medium ${office.highlight ? 'text-gray-50' : 'text-gray-700'}`}>
                      {office.phone}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
