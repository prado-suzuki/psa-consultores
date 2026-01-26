import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, ChevronDown } from "lucide-react";
import { BrazilMap } from "./BrazilMap";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const offices = [
  {
    id: "cuiaba",
    city: "Cuiabá",
    state: "MT",
    type: "Matriz",
    email: "contato@pradosuzuki.com",
    phone: "(65) 3622-2426",
    address: "Rua Des. José Barros do Vale, 03 – Bairro Duque de Caxias – Cuiabá/MT, CEP 78043-292",
  },
  {
    id: "sinop",
    city: "Sinop",
    state: "MT",
    type: "Filial",
    email: "contato@pradosuzuki.com",
    phone: "(65) 3622-2426",
    address: "Av. das Itaúbas 3020, Sinop, MT, 78550-086",
  },
  {
    id: "barreiras",
    city: "Barreiras",
    state: "BA",
    type: "Filial",
    email: "barreiras@psaconsultores.com.br",
    phone: "(77) 3614-0000",
    address: "Rua Exemplo, 123 - Centro, Barreiras - BA, 47800-000",
  },
  {
    id: "curitiba",
    city: "Curitiba",
    state: "PR",
    type: "Filial",
    email: "curitiba@psaconsultores.com.br",
    phone: "(41) 3333-0000",
    address: "Rua Exemplo, 456 - Batel, Curitiba - PR, 80420-000",
  },
];

export const OfficesSection = () => {
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);

  return (
    <section className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Mapa - Esquerda */}
          <div className="order-2 lg:order-1">
            <BrazilMap />
          </div>

          {/* Conteúdo - Direita */}
          <div className="order-1 lg:order-2 space-y-8">
            {/* Título e Subtítulo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Onde Estamos
              </h2>
              <p className="text-gray-600">
                Presença estratégica nas principais regiões do agronegócio brasileiro, 
                atendendo clientes em todo o território nacional.
              </p>
            </motion.div>

            {/* Cards de Escritórios */}
            <div className="space-y-3">
              {offices.map((office, index) => (
                <motion.div
                  key={office.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.15 }}
                >
                  <Collapsible
                    open={expandedOffice === office.id}
                    onOpenChange={(open) => setExpandedOffice(open ? office.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
                        {/* Header do card */}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                              {office.type}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900 mt-1">
                              Escritório {office.city}
                            </h3>
                            
                            {/* Contatos discretos */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                              <a 
                                href={`mailto:${office.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
                              >
                                <Mail className="h-3 w-3" />
                                {office.email}
                              </a>
                              <a 
                                href={`tel:${office.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
                              >
                                <Phone className="h-3 w-3" />
                                {office.phone}
                              </a>
                            </div>
                          </div>
                          
                          {/* Badge estado + Chevron */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {office.state}
                            </span>
                            <ChevronDown 
                              className={`h-4 w-4 text-gray-400 transition-transform ${
                                expandedOffice === office.id ? 'rotate-180' : ''
                              }`} 
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    {/* Conteúdo expandido - Endereço */}
                    <CollapsibleContent>
                      <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 -mt-1">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600">{office.address}</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
