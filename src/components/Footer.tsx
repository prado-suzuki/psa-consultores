import logo from "@/assets/logo-psa.png";
import { Linkedin, Instagram, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-50 py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <img src={logo} alt="PSA Consultores" className="h-12 w-auto brightness-0 invert" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Transformando negócios através de consultoria estratégica e desenvolvimento organizacional.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Serviços</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-primary transition-colors">Planejamento Estratégico</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Gestão de Performance</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Desenvolvimento Organizacional</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Otimização de Processos</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-primary transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cases de Sucesso</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Nossa Equipe</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Carreira</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>São Paulo, SP</li>
              <li>(11) 9999-9999</li>
              <li>contato@psaconsultores.com.br</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© 2024 PSA Consultores. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
